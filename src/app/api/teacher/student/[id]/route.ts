import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;

    const student = await prisma.user.findUnique({
      where: { id, role: "STUDENT" },
      select: {
        id: true, name: true, email: true, phone: true, photo: true, bio: true, createdAt: true,
      },
    });

    if (!student) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });

    // Bu öğretmene ait gruplarda mı?
    const enrollments = await prisma.enrollmentRequest.findMany({
      where: {
        studentId: id,
        teacherId: currentUser.id,
        status: "ACCEPTED",
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    // Tamamladığı testler
    const attempts = await prisma.studentAttempt.findMany({
      where: { studentId: id, finishedAt: { not: null } },
      include: {
        package: {
          select: {
            name: true,
            collection: { select: { name: true } },
          },
        },
        answers: {
          include: {
            question: { select: { text: true, type: true } },
          },
        },
      },
      orderBy: { finishedAt: "desc" },
    });

    return NextResponse.json({ student, enrollments, attempts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}