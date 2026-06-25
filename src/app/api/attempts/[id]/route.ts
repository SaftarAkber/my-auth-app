import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Cevapları kaydet ve testi bitir
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { answers } = await req.json();
    // answers: [{ questionId: string, answer: string }]

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        package: {
          include: {
            questions: { where: { isActive: true } },
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== currentUser.id) {
      return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    }

    if (attempt.finishedAt) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    let correctCount = 0;
    const totalMC = attempt.package.questions.filter(
      (q) => q.type === "MULTIPLE_CHOICE"
    ).length;

    const answerData = (answers as { questionId: string; answer: string }[]).map((a) => {
      const question = attempt.package.questions.find((q) => q.id === a.questionId);
      let isCorrect: boolean | null = null;
      let status: "APPROVED" | "PENDING" = "PENDING";

      if (question?.type === "MULTIPLE_CHOICE") {
        isCorrect = question.correctAnswer === a.answer;
        if (isCorrect) correctCount++;
        status = "APPROVED";
      }

      return {
        attemptId: attempt.id,
        questionId: a.questionId,
        answer: a.answer,
        isCorrect,
        status,
      };
    });

    await prisma.studentAnswer.createMany({ data: answerData });

    const updated = await prisma.studentAttempt.update({
      where: { id: attempt.id },
      data: {
        finishedAt: new Date(),
        score: correctCount,
        totalScore: totalMC,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

// Attempt detayını getir
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, photo: true } },
        package: {
          select: {
            id: true,
            name: true,
            isTimed: true,
            duration: true,
            group: {
              select: {
                id: true,
                name: true,
                teacherId: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                options: true,
                correctAnswer: true,
                order: true,
              },
            },
          },
          orderBy: { question: { order: "asc" } },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    }

    const isOwner = attempt.studentId === currentUser.id;
    const isTeacher = attempt.package.group?.teacherId === currentUser.id;

    if (!isOwner && !isTeacher) {
      return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
    }

    return NextResponse.json(attempt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}