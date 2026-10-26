import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { grantTestReward } from "@/lib/rewards";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

// Cavabları saxla və testi bitir
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const body = await req.json();
    const answers: { questionId: string; answer: string }[] = Array.isArray(body.answers)
      ? body.answers
      : [];

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        package: { include: { questions: { where: { isActive: true } } } },
      },
    });

    if (!attempt || attempt.studentId !== currentUser.id) return notFound();
    if (attempt.finishedAt) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    // Vaxt limiti (şəbəkə gecikməsi üçün 30 san. tolerans)
    const { package: pkg } = attempt;
    if (pkg.isTimed && pkg.duration) {
      const deadline = attempt.startedAt.getTime() + (pkg.duration + 30) * 1000;
      if (Date.now() > deadline) {
        return NextResponse.json({ error: "Testin vaxtı bitib" }, { status: 409 });
      }
    }

    const questionMap = new Map(pkg.questions.map((q) => [q.id, q]));
    const seen = new Set<string>();
    let correctCount = 0;

    const answerData = answers.flatMap((a) => {
      const question = questionMap.get(a.questionId);
      if (!question || seen.has(a.questionId)) return [];
      if (typeof a.answer !== "string" || !a.answer.trim()) return [];
      seen.add(a.questionId);

      let isCorrect: boolean | null = null;
      let status: "APPROVED" | "PENDING" = "PENDING";
      if (question.type === "MULTIPLE_CHOICE") {
        isCorrect = question.correctAnswer === a.answer;
        if (isCorrect) correctCount++;
        status = "APPROVED";
      }
      return [{ attemptId: attempt.id, questionId: a.questionId, answer: a.answer, isCorrect, status }];
    });

    // Yarış vəziyyətinin qarşısı: yalnız hələ bitməmiş cəhd bağlanır
    const updated = await prisma.$transaction(async (tx) => {
      const closed = await tx.studentAttempt.updateMany({
        where: { id: attempt.id, finishedAt: null },
        data: { finishedAt: new Date(), score: correctCount, totalScore: pkg.questions.length },
      });
      if (closed.count === 0) return null;
      if (answerData.length) await tx.studentAnswer.createMany({ data: answerData });
      return tx.studentAttempt.findUnique({ where: { id: attempt.id } });
    });

    if (!updated) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    // Mükafat: müəllimin test üçün qoyduğu qayda ödənibsə (avtomatik rejimdə) coin müəllimdən köçürülür.
    // Açıq cavablar hələ yoxlanmayıbsa, nəticə təsdiqlənənədək gözlənilir.
    let coinsEarned = 0;
    let rewardPending = false;
    const hasOpen = pkg.questions.some((q) => q.type === "OPEN_ENDED");
    if (pkg.rewardEnabled && pkg.rewardAuto && !hasOpen) {
      try {
        const r = await grantTestReward(attempt.id);
        if (r.status === "granted") coinsEarned = r.coins;
        if (r.status === "insufficient") rewardPending = true;
      } catch (coinErr) {
        console.error("Mükafat xətası:", coinErr);
      }
    }

    return NextResponse.json({ ...updated, coinsEarned, rewardPending });
  } catch (error) {
    return serverError(error);
  }
}

// Cəhd təfərrüatı
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, photo: true } },
        package: {
          select: {
            id: true, name: true, isTimed: true, duration: true, shareAnswers: true,
            group: { select: { id: true, name: true, teacherId: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: { id: true, text: true, type: true, options: true, correctAnswer: true, order: true },
            },
          },
          orderBy: { question: { order: "asc" } },
        },
      },
    });
    if (!attempt) return notFound();

    const isOwner = attempt.studentId === currentUser.id;
    const isTeacher =
      currentUser.role === "TEACHER" &&
      (attempt.package.group?.teacherId === currentUser.id ||
        (await teacherOwnsTestPackage(currentUser.id, attempt.package.id)));
    // Müəllim icazə veribsə, testi özü bitirmiş tələbələr bir-birinin bitmiş cavablarına baxa bilər
    const isPeer =
      !isOwner && !isTeacher && currentUser.role === "STUDENT" && attempt.package.shareAnswers && !!attempt.finishedAt &&
      !!(await prisma.studentAttempt.findFirst({
        where: { packageId: attempt.package.id, studentId: currentUser.id, finishedAt: { not: null } },
        select: { id: true },
      }));
    if (!isOwner && !isTeacher && !isPeer) return forbidden();

    // Davam edən testdə cavab açarı açıqlanmasın
    if (isOwner && !isTeacher && !attempt.finishedAt) {
      return NextResponse.json({
        ...attempt,
        answers: attempt.answers.map((a) => ({
          ...a,
          question: { ...a.question, correctAnswer: null },
        })),
      });
    }

    return NextResponse.json(attempt);
  } catch (error) {
    return serverError(error);
  }
}
