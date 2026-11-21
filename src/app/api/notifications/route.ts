import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";
import { collapsePosts } from "@/lib/posts";
import { visibleTestWhere } from "@/lib/topics";
import { visibleVideoWhere } from "@/lib/videoAccess";

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
              package: { deletedAt: null },
              OR: [
                { package: { collection: { teacherId: user.id } } },
                { package: { group: { teacherId: user.id } } },
              ],
            },
          },
          select: { createdAt: true, attempt: { select: { studentId: true, packageId: true, package: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
      ]);
      for (const r of requests) {
        items.push({ id: `r${r.id}`, text: `${r.student.name} “${r.group.name}” qrupuna qoşulmaq istəyir`, href: "/teacher/requests", at: iso(r.createdAt) });
      }
      // Test üzrə bir sətir: "X nəfər testi bitirdi, açıq suallar yoxlanılmağı gözləyir"
      const byPkg = new Map<string, { name: string; students: Set<string>; at: Date }>();
      for (const a of pendingAnswers) {
        const g = byPkg.get(a.attempt.packageId) ?? { name: a.attempt.package.name, students: new Set<string>(), at: a.createdAt };
        g.students.add(a.attempt.studentId);
        if (a.createdAt > g.at) g.at = a.createdAt;
        byPkg.set(a.attempt.packageId, g);
      }
      for (const [pid, g] of [...byPkg.entries()].slice(0, 6)) {
        items.push({
          id: `a${pid}-${g.students.size}-${g.at.getTime()}`,
          text: `${g.students.size} nəfər “${g.name}” testini bitirdi, açıq suallar yoxlanılmağı gözləyir`,
          href: "/teacher/attempts",
          at: iso(g.at),
        });
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
      // Qruplarımın müəllimlərindən yeni məzmun: paylaşım, mövzu, video, test paketi
      const memberships = await prisma.groupMember.findMany({
        where: { studentId: user.id },
        select: { groupId: true, group: { select: { teacherId: true } } },
      });
      const groupIds = memberships.map((m) => m.groupId);
      const teacherIds = [...new Set(memberships.map((m) => m.group.teacherId))];
      if (teacherIds.length) {
        const [posts, topics, videos, tests] = await Promise.all([
          prisma.groupPost.findMany({
            where: { teacherId: { in: teacherIds }, createdAt: { gte: since }, OR: [{ groupId: { in: groupIds } }, { visibility: "PUBLIC" }] },
            select: { id: true, teacherId: true, content: true, createdAt: true, group: { select: { id: true, name: true } }, teacher: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 30,
          }),
          prisma.topic.findMany({
            where: {
              teacherId: { in: teacherIds }, isPublished: true, publishedAt: { gte: since },
              OR: [{ visibility: "PUBLIC" }, { groups: { some: { groupId: { in: groupIds } } } }],
            },
            select: { id: true, title: true, publishedAt: true, teacher: { select: { name: true } } },
            orderBy: { publishedAt: "desc" },
            take: 6,
          }),
          prisma.video.findMany({
            where: { AND: [visibleVideoWhere(groupIds), { teacherId: { in: teacherIds }, publishedAt: { gte: since } }] },
            select: { id: true, title: true, publishedAt: true, teacher: { select: { name: true } } },
            orderBy: { publishedAt: "desc" },
            take: 6,
          }),
          prisma.testPackage.findMany({
            where: {
              AND: [
                visibleTestWhere(groupIds),
                { publishedAt: { gte: since } },
                { OR: [{ collection: { teacherId: { in: teacherIds } } }, { group: { teacherId: { in: teacherIds } } }, { testPackageGroups: { some: { groupId: { in: groupIds } } } }] },
              ],
            },
            select: {
              id: true, name: true, publishedAt: true, isBank: true, groupId: true,
              testPackageGroups: { where: { groupId: { in: groupIds } }, select: { groupId: true } },
            },
            orderBy: { publishedAt: "desc" },
            take: 6,
          }),
        ]);
        for (const p of collapsePosts(posts).slice(0, 6)) {
          const snippet = p.content.replace(/\s+/g, " ").trim().slice(0, 60);
          items.push({ id: `p${p.id}`, text: `${p.teacher.name} yeni paylaşım etdi${snippet ? `: “${snippet}${p.content.length > 60 ? "…" : ""}”` : ""}`, href: `/student?post=${p.id}`, at: iso(p.createdAt) });
        }
        for (const t of topics) {
          items.push({ id: `t${t.id}`, text: `${t.teacher.name} yeni mövzu paylaşdı: “${t.title}”`, href: `/student/topics/${t.id}`, at: iso(t.publishedAt!) });
        }
        for (const v of videos) {
          items.push({ id: `v${v.id}`, text: `${v.teacher.name} yeni video paylaşdı: “${v.title}”`, href: `/watch/${v.id}?play=1`, at: iso(v.publishedAt!) });
        }
        for (const t of tests) {
          const gid = (t.groupId && groupIds.includes(t.groupId) ? t.groupId : null) ?? t.testPackageGroups[0]?.groupId ?? null;
          const href = gid ? `/student/groups/${gid}?tab=tests&pkg=${t.id}` : "/student/my-tests";
          items.push({ id: `k${t.id}`, text: `Yeni test paketi: “${t.name}”`, href, at: iso(t.publishedAt!) });
        }
      }
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
        where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) }, deletedAt: null },
        select: { id: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      for (const u of users) {
        items.push({ id: `u${u.id}`, text: `Yeni ${u.role === "TEACHER" ? "müəllim" : "tələbə"} hesabı: ${u.name}`, href: "/admin", at: iso(u.createdAt) });
      }
    }

    items.sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ items: items.slice(0, 15), count: items.length });
  } catch (error) {
    return serverError(error);
  }
}
