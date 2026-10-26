import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";

const DAY = 24 * 60 * 60 * 1000;

// Admin dashboard: ümumi göstəricilər, son 14 günün qeydiyyatları, son hesablar
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const since = new Date(Date.now() - 13 * DAY);
    since.setHours(0, 0, 0, 0);

    const [roles, groups, activeGroups, tests, publishedTests, videos, posts, pending, attempts, coins, recentRaw, signupsRaw] =
      await Promise.all([
        prisma.user.groupBy({ by: ["role"], _count: true }),
        prisma.group.count(),
        prisma.group.count({ where: { isActive: true } }),
        prisma.testPackage.count(),
        prisma.testPackage.count({ where: { isPublished: true } }),
        prisma.video.count(),
        prisma.groupPost.count(),
        prisma.enrollmentRequest.count({ where: { status: "PENDING" } }),
        prisma.studentAttempt.count({ where: { finishedAt: { not: null } } }),
        prisma.user.aggregate({ _sum: { coinBalance: true } }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, name: true, role: true, createdAt: true, photo: true },
        }),
        prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      ]);

    const count = (r: string) => roles.find((x) => x.role === r)?._count ?? 0;

    // Gün üzrə qeydiyyat sayı (son 14 gün)
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    for (const u of signupsRaw) {
      const key = u.createdAt.toISOString().slice(0, 10);
      const slot = days.find((d) => d.date === key);
      if (slot) slot.count++;
    }

    return NextResponse.json({
      users: { total: count("STUDENT") + count("TEACHER") + count("ADMIN"), teachers: count("TEACHER"), students: count("STUDENT"), admins: count("ADMIN") },
      content: { groups, activeGroups, tests, publishedTests, videos, posts },
      pendingRequests: pending,
      attempts,
      coinsInCirculation: coins._sum.coinBalance ?? 0,
      recentUsers: recentRaw,
      signups: days,
    });
  } catch (error) {
    return serverError(error);
  }
}
