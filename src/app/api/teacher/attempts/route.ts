import { NextRequest, NextResponse } from "next/server";
import { ownedTestWhere } from "@/lib/topics";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const attempts = await prisma.studentAttempt.findMany({
      where: {
        finishedAt: { not: null },
        package: ownedTestWhere(currentUser.id),
        // ?pending=1: yalnız yoxlanmalı açıq cavabı olan cəhdlər
        ...(req.nextUrl.searchParams.get("pending") ? { answers: { some: { status: "PENDING" as const } } } : {}),
      },
      include: {
        student: {
          select: { id: true, name: true, photo: true, email: true, phone: true },
        },
        package: {
          select: {
            id: true,
            name: true,
            rewardEnabled: true,
            rewardMinCorrect: true,
            rewardCoins: true,
            rewardAuto: true,
            collection: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                text: true,
                type: true,
                options: true,
                imageUrl: true,
                correctAnswer: true,
              },
            },
          },
        },
      },
      orderBy: { finishedAt: "desc" },
      take: 300,
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}