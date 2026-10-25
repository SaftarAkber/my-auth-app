import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";

interface Item {
  id: string;
  text: string;
  href: string;
  at: string;
}

const iso = (d: Date) => d.toISOString();
const DAY = 24 * 60 * 60 * 1000;

// Rola görə hesablanan bildirimlər (ayrıca bildiriş cədvəli yoxdur)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const items: Item[] = [];

    if (user.role === "TEACHER") {
      const [requests, pendingAnswers] = await Promise.all([
        prisma.enrollmentRequest.findMany({
          where: { teacherId: user.id, status: "PENDING" },
          include: { student: { select: { name: true } }, group: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.studentAnswer.findMany({
          where: {
            status: "PENDING",
            question: { type: "OPEN_ENDED" },
            attempt: {
              OR: [
                { package: { collection: { teacherId: user.id } } },
                { package: { group: { teacherId: user.id } } },
              ],
            },
          },
          include: { attempt: { select: { student: { select: { name: true } }, package: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);
      for (const r of requests) {
        items.push({ id: `r${r.id}`, text: `${r.student.name} “${r.group.name}” qrupuna qoşulmaq istəyir`, href: "/teacher/requests", at: iso(r.createdAt) });
      }
      for (const a of pendingAnswers) {
        items.push({ id: `a${a.id}`, text: `${a.attempt.student.name}: “${a.attempt.package.name}” açıq cavabı yoxlanmağı gözləyir`, href: "/teacher/attempts", at: iso(a.createdAt) });
      }
    } else if (user.role === "STUDENT") {
      const since = new Date(Date.now() - 14 * DAY);
      const [coins, replies] = await Promise.all([
        prisma.coinTransaction.findMany({
          where: { userId: user.id, createdAt: { gte: since }, type: { in: ["GIFT_RECEIVED", "TEST_REWARD"] } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.enrollmentRequest.findMany({
          where: { studentId: user.id, status: { in: ["ACCEPTED", "DECLINED"] }, updatedAt: { gte: since } },
          include: { group: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
      ]);
      for (const c of coins) {
        items.push({ id: `c${c.id}`, text: `Müəllimdən ${c.amount} coin aldın${c.reason ? `: ${c.reason}` : ""}`, href: "/student", at: iso(c.createdAt) });
      }
      for (const r of replies) {
        items.push({
          id: `e${r.id}`,
          text: r.status === "ACCEPTED" ? `“${r.group.name}” qrupuna qəbul olundun` : `“${r.group.name}” müraciətin rədd edildi`,
          href: r.status === "ACCEPTED" ? `/student/groups/${r.groupId}` : "/student/teacher",
          at: iso(r.updatedAt),
        });
      }
    } else {
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } },
        select: { id: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      for (const u of users) {
        items.push({ id: `u${u.id}`, text: `Yeni ${u.role === "TEACHER" ? "müəllim" : "tələbə"} hesabı: ${u.name}`, href: "/admin", at: iso(u.createdAt) });
      }
    }

    items.sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ items: items.slice(0, 10), count: items.length });
  } catch (error) {
    return serverError(error);
  }
}
