import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const attempts = await prisma.studentAttempt.findMany({
      where: {
        finishedAt: { not: null },
        package: {
          OR: [
            { collection: { teacherId: currentUser.id } },
            { group: { teacherId: currentUser.id } },
          ],
        },
      },
      include: {
        student: {
          select: { id: true, name: true, photo: true, email: true, phone: true },
        },
        package: {
          select: {
            name: true,
            collection: { select: { name: true } },
            group: { select: { name: true } },
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

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}