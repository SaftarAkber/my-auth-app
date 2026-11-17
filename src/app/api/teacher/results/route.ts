import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacher, serverError } from "@/lib/guards";
import { ownedTestWhere } from "@/lib/topics";

/** Müəllimin nəticələr səhifəsi: işlənmiş test paketləri (tələbə, cəhd və yoxlanmalı cavab sayı ilə) */
export async function GET() {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const owned = ownedTestWhere(auth.user.id);

    const [pkgs, perStudent, pending] = await Promise.all([
      prisma.testPackage.findMany({
        where: { ...owned, attempts: { some: { finishedAt: { not: null } } } },
        select: { id: true, name: true, isBank: true, isMonthly: true, collection: { select: { name: true } } },
      }),
      prisma.studentAttempt.groupBy({
        by: ["packageId", "studentId"],
        where: { finishedAt: { not: null }, package: owned },
        _count: { _all: true },
        _max: { finishedAt: true },
      }),
      prisma.studentAttempt.findMany({
        where: { finishedAt: { not: null }, package: owned, answers: { some: { status: "PENDING" } } },
        select: { packageId: true },
      }),
    ]);

    const stats = new Map<string, { students: number; attempts: number; lastAt: Date | null; pending: number }>();
    for (const r of perStudent) {
      const s = stats.get(r.packageId) ?? { students: 0, attempts: 0, lastAt: null, pending: 0 };
      s.students++;
      s.attempts += r._count._all;
      if (r._max.finishedAt && (!s.lastAt || r._max.finishedAt > s.lastAt)) s.lastAt = r._max.finishedAt;
      stats.set(r.packageId, s);
    }
    for (const p of pending) {
      const s = stats.get(p.packageId);
      if (s) s.pending++;
    }

    const packages = pkgs
      .map((p) => ({ ...p, ...(stats.get(p.id) ?? { students: 0, attempts: 0, lastAt: null, pending: 0 }) }))
      .sort((a, b) => +(b.lastAt ?? 0) - +(a.lastAt ?? 0));
    return NextResponse.json({ packages });
  } catch (error) {
    return serverError(error);
  }
}
