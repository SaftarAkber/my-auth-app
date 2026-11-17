import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ packageId: string }> };

/** Bir paketin nəticələri: hər tələbə üçün bir sətir və onun bütün cəhdləri (cavablarsız, yüngül) */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const { packageId } = await params;
    if (me.role !== "ADMIN" && !(me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, packageId)))) return forbidden();

    const pkg = await prisma.testPackage.findUnique({
      where: { id: packageId },
      select: { id: true, name: true, isBank: true, isMonthly: true, rewardEnabled: true, rewardMinCorrect: true, rewardCoins: true, rewardAuto: true },
    });
    if (!pkg) return notFound();

    const attempts = await prisma.studentAttempt.findMany({
      where: { packageId, finishedAt: { not: null } },
      select: {
        id: true, score: true, totalScore: true, startedAt: true, finishedAt: true, rewardGranted: true, rewardCoins: true,
        student: { select: { id: true, name: true, photo: true } },
        _count: { select: { answers: { where: { status: "PENDING" } } } },
      },
      orderBy: { startedAt: "asc" },
    });

    const byStudent = new Map<string, { student: (typeof attempts)[number]["student"]; attempts: unknown[] }>();
    for (const a of attempts) {
      const row = byStudent.get(a.student.id) ?? { student: a.student, attempts: [] };
      row.attempts.push({
        id: a.id, score: a.score, totalScore: a.totalScore, startedAt: a.startedAt, finishedAt: a.finishedAt,
        rewardGranted: a.rewardGranted, rewardCoins: a.rewardCoins, pending: a._count.answers,
        // Aylıq sınaqda cədvələ ilk cəhd düşür, qalanları məşqdir
        first: row.attempts.length === 0,
      });
      byStudent.set(a.student.id, row);
    }
    return NextResponse.json({ package: pkg, students: [...byStudent.values()] });
  } catch (error) {
    return serverError(error);
  }
}
