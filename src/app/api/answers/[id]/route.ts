import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

// Müəllim açıq uçlu sualı qiymətləndirir
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { status, teacherComment } = await req.json();

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Status APPROVED və ya REJECTED olmalıdır" }, { status: 400 });
    }

    const existing = await prisma.studentAnswer.findUnique({
      where: { id },
      include: { attempt: { select: { id: true, packageId: true } } },
    });
    if (!existing) return notFound();
    if (!(await teacherOwnsTestPackage(auth.user.id, existing.attempt.packageId))) return forbidden();

    const answer = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentAnswer.update({
        where: { id },
        data: {
          status,
          isCorrect: status === "APPROVED",
          teacherComment: teacherComment || null,
        },
      });
      // Bal yenidən hesablanır (açıq uçlu cavablar da nəzərə alınır)
      const score = await tx.studentAnswer.count({
        where: { attemptId: existing.attempt.id, isCorrect: true },
      });
      await tx.studentAttempt.update({ where: { id: existing.attempt.id }, data: { score } });
      return updated;
    });

    return NextResponse.json({ answer });
  } catch (error) {
    return serverError(error);
  }
}
