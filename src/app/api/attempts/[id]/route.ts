import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Testi tamamla və cavabları yadda saxla
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Səlahiyyətiniz yoxdur" }, { status: 401 });

    const { id: attemptId } = await params;
    const { answers } = await req.json();
    // cavablar: [{ questionId, answer }]

    const attempt = await prisma.studentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        package: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    if (attempt.finishedAt) return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });

    // Cavabları yadda saxla
    let correctCount = 0;
    let totalMultipleChoice = 0;

    const answerRecords = await Promise.all(
      answers.map(async (a: { questionId: string; answer: string }) => {
        const question = attempt.package.questions.find((q) => q.id === a.questionId);
        if (!question) return null;

        let isCorrect: boolean | null = null;
        if (question.type === "MULTIPLE_CHOICE") {
          isCorrect = question.correctAnswer === a.answer;
          totalMultipleChoice++;
          if (isCorrect) correctCount++;
        }

        return prisma.studentAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: a.questionId } },
          create: {
            attemptId,
            questionId: a.questionId,
            answer: a.answer,
            isCorrect,
            status: question.type === "OPEN_ENDED" ? "PENDING" : isCorrect ? "APPROVED" : "REJECTED",
          },
          update: {
            answer: a.answer,
            isCorrect,
            status: question.type === "OPEN_ENDED" ? "PENDING" : isCorrect ? "APPROVED" : "REJECTED",
          },
        });
      })
    );

    // Cəhdi (Attempt) tamamlanmış olaraq işarələ
    const updated = await prisma.studentAttempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        score: correctCount,
        totalScore: totalMultipleChoice,
      },
      include: {
        answers: { include: { question: true } },
        package: { select: { name: true } },
      },
    });

    return NextResponse.json({ attempt: updated, answers: answerRecords });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}