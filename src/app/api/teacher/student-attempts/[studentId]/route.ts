import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, serverError } from "@/lib/guards";
import { ownedTestWhere } from "@/lib/topics";

/** Tələbənin bu müəllimin testlərindəki bitmiş cəhdləri (profildə "Test keçmişi") */
export async function GET(_: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { studentId } = await params;

    const attempts = await prisma.studentAttempt.findMany({
      where: { studentId, finishedAt: { not: null }, package: ownedTestWhere(auth.user.id) },
      select: {
        id: true, score: true, totalScore: true, finishedAt: true,
        package: { select: { id: true, name: true, isBank: true, isMonthly: true } },
      },
      orderBy: { finishedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ attempts });
  } catch (error) {
    return serverError(error);
  }
}
