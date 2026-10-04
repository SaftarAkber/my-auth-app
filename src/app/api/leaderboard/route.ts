import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";

// GET /api/leaderboard            → coin üzrə ən yaxşı 20 tələbə
// GET /api/leaderboard?packageId= → həmin testdə ən yaxşı nəticələr
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const packageId = new URL(req.url).searchParams.get("packageId");

    if (packageId) {
      const attempts = await prisma.studentAttempt.findMany({
        where: { packageId, finishedAt: { not: null } },
        select: {
          id: true, score: true, totalScore: true, startedAt: true, finishedAt: true,
          student: { select: { id: true, name: true, photo: true } },
        },
        orderBy: [{ score: "desc" }, { finishedAt: "asc" }],
      });

      // Hər tələbədən yalnız ən yaxşı nəticə
      const best = new Map<string, (typeof attempts)[number]>();
      for (const a of attempts) if (!best.has(a.student.id)) best.set(a.student.id, a);

      const entries = [...best.values()].slice(0, 20).map((a, i) => ({
        rank: i + 1,
        student: a.student,
        score: a.score,
        totalScore: a.totalScore,
        durationSec:
          a.finishedAt ? Math.round((a.finishedAt.getTime() - a.startedAt.getTime()) / 1000) : null,
        isMe: a.student.id === currentUser.id,
      }));
      return NextResponse.json({ entries });
    }

    const users = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, photo: true, coinBalance: true },
      orderBy: { coinBalance: "desc" },
      take: 20,
    });
    const entries = users.map((u, i) => ({
      rank: i + 1,
      student: { id: u.id, name: u.name, photo: u.photo },
      coins: u.coinBalance,
      isMe: u.id === currentUser.id,
    }));
    return NextResponse.json({ entries });
  } catch (error) {
    return serverError(error);
  }
}
