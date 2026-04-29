import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Müəllim açıq uçlu sualı qiymətləndirir
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Səlahiyyətiniz yoxdur" }, { status: 401 });
    }

    const { id } = await params;
    const { status, teacherComment } = await req.json();

    const answer = await prisma.studentAnswer.update({
      where: { id },
      data: {
        status,
        isCorrect: status === "APPROVED",
        teacherComment: teacherComment || null,
      },
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}