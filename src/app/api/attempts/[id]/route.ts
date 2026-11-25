import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { closeExpiredAttempts, finishAttempt, isExpired } from "@/lib/attempts";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

// Cavabları yoxla və testi bitir
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const list: { questionId: string; answer: string }[] = Array.isArray(body.answers) ? body.answers : [];

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      select: { id: true, studentId: true, startedAt: true, finishedAt: true, package: { select: { isTimed: true, duration: true } } },
    });
    if (!attempt || attempt.studentId !== currentUser.id) return notFound();
    if (attempt.finishedAt) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    // Vaxt bitibsə yalnız əvvəl saxlanmış cavablar sayılır
    const incoming: Record<string, string> = {};
    for (const a of list) {
      if (a && typeof a.questionId === "string" && typeof a.answer === "string" && a.answer.trim()) incoming[a.questionId] = a.answer;
    }
    const r = await finishAttempt(attempt.id, isExpired(attempt.startedAt, attempt.package) ? null : incoming);
    if (!r) return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });

    return NextResponse.json({ ...r.attempt, coinsEarned: r.coinsEarned, rewardPending: r.rewardPending });
  } catch (error) {
    return serverError(error);
  }
}

// Davam edən testdə bir cavabı saxla (səhifə bağlansa da cavab itmir)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const answer = typeof body.answer === "string" ? body.answer.slice(0, 5000) : "";
    if (!questionId) return NextResponse.json({ error: "Sual seçilməyib" }, { status: 400 });

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      select: {
        id: true, studentId: true, startedAt: true, finishedAt: true, packageId: true, questionIds: true,
        package: { select: { isTimed: true, duration: true } },
      },
    });
    if (!attempt || attempt.studentId !== currentUser.id) return notFound();
    if (attempt.finishedAt || isExpired(attempt.startedAt, attempt.package)) {
      return NextResponse.json({ error: "Testin vaxtı bitib" }, { status: 409 });
    }
    const belongs = attempt.questionIds.length
      ? attempt.questionIds.includes(questionId)
      : !!(await prisma.question.findFirst({ where: { id: questionId, packageId: attempt.packageId, isActive: true }, select: { id: true } }));
    if (!belongs) return NextResponse.json({ error: "Sual bu testdə deyil" }, { status: 400 });

    // Yalnız bir açar yenilənir (eyni anda gələn sorğular bir-birini silmir)
    if (answer.trim()) {
      await prisma.$executeRaw`UPDATE "student_attempts" SET "draft" = COALESCE("draft", '{}'::jsonb) || jsonb_build_object(${questionId}::text, ${answer}::text) WHERE "id" = ${id} AND "finishedAt" IS NULL`;
    } else {
      await prisma.$executeRaw`UPDATE "student_attempts" SET "draft" = COALESCE("draft", '{}'::jsonb) - ${questionId}::text WHERE "id" = ${id} AND "finishedAt" IS NULL`;
    }
    return NextResponse.json({ ok: true });
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

    // Vaxtı bitmiş açıq cəhd əvvəlcə bağlanır
    await closeExpiredAttempts({ id });

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, photo: true } },
        package: {
          select: {
            id: true, name: true, isTimed: true, duration: true, shareAnswers: true, allowRetry: true, isBank: true, isMonthly: true,
            group: { select: { id: true, name: true, teacherId: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: { id: true, text: true, type: true, options: true, correctAnswer: true, imageUrl: true, order: true },
            },
          },
          orderBy: { question: { order: "asc" } },
        },
      },
    });
    if (!attempt) return notFound();

    const isOwner = attempt.studentId === currentUser.id;
    const isTeacher =
      currentUser.role === "ADMIN" ||
      (currentUser.role === "TEACHER" &&
        (attempt.package.group?.teacherId === currentUser.id ||
          (await teacherOwnsTestPackage(currentUser.id, attempt.package.id))));
    // Müəllim icazə veribsə, testi özü bitirmiş tələbələr bir-birinin bitmiş cavablarına baxa bilər (bank testində yox)
    const isPeer =
      !isOwner && !isTeacher && currentUser.role === "STUDENT" && attempt.package.shareAnswers && !attempt.package.isBank && !!attempt.finishedAt &&
      !!(await prisma.studentAttempt.findFirst({
        where: { packageId: attempt.package.id, studentId: currentUser.id, finishedAt: { not: null } },
        select: { id: true },
      }));
    if (!isOwner && !isTeacher && !isPeer) return forbidden();

    // Davam edən testdə cavab açarı açıqlanmasın
    if (!isTeacher && !attempt.finishedAt) {
      return NextResponse.json({
        ...attempt,
        answers: attempt.answers.map((a) => ({
          ...a,
          question: { ...a.question, correctAnswer: null },
        })),
      });
    }

    const qSelect = { id: true, text: true, type: true, options: true, correctAnswer: true, imageUrl: true, order: true } as const;

    // Bank testi: bu cəhdə düşən suallar seçim sırası ilə, cavabsızlar da göstərilir
    if (attempt.questionIds.length) {
      const pos = new Map(attempt.questionIds.map((qid, i) => [qid, i]));
      const numbers: Record<string, number> = Object.fromEntries(attempt.questionIds.map((qid, i) => [qid, i + 1]));
      const answered = new Set(attempt.answers.map((a) => a.question.id));
      const blankRows = attempt.finishedAt
        ? await prisma.question.findMany({ where: { id: { in: attempt.questionIds.filter((q) => !answered.has(q)) } }, select: qSelect })
        : [];
      return NextResponse.json({
        ...attempt,
        answers: attempt.answers.map((a) => ({ ...a, question: { ...a.question, order: pos.get(a.question.id) ?? 0 } })),
        numbers,
        blanks: blankRows.map((q) => ({ ...q, order: pos.get(q.id) ?? 0 })),
      });
    }

    // Təkrar həllə icazə verilməyən testdə bitmiş nəticədə bütün suallar ardıcıl göstərilir (cavabsızlar da).
    // Təkrar olanlarda yalnız cavab verilmiş suallar (düzgün/səhv) qalır.
    const activeQuestions = await prisma.question.findMany({
      where: { packageId: attempt.package.id, isActive: true },
      orderBy: { order: "asc" },
      select: qSelect,
    });
    const numbers: Record<string, number> = Object.fromEntries(activeQuestions.map((q, i) => [q.id, i + 1]));
    const answered = new Set(attempt.answers.map((a) => a.question.id));
    const blanks =
      attempt.finishedAt && !attempt.package.allowRetry ? activeQuestions.filter((q) => !answered.has(q.id)) : [];

    return NextResponse.json({ ...attempt, numbers, blanks });
  } catch (error) {
    return serverError(error);
  }
}

/**
 * Cəhdi sil (yalnız paketin müəllimi və ya admin): cəhd, cavabları və şərhləri birdəfəlik silinir;
 * reytinq və aylıq cədvəl onsuz yenidən hesablanır. Verilmiş coin geri alınmır.
 */
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      select: { id: true, packageId: true, package: { select: { group: { select: { teacherId: true } } } } },
    });
    if (!attempt) return notFound();
    const allowed =
      user.role === "ADMIN" ||
      (user.role === "TEACHER" && (attempt.package.group?.teacherId === user.id || (await teacherOwnsTestPackage(user.id, attempt.packageId))));
    if (!allowed) return forbidden();
    await prisma.studentAttempt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
