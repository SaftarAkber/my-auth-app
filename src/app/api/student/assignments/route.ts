import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, serverError } from "@/lib/guards";
import { ASSIGNMENT_SELECT, countedAttempts, statusOf } from "@/lib/assignments";

/** Tələbə: tapşırıqlarım (aktiv / bitmiş / vaxtı keçmiş), irəliləyiş və paketə keçid üçün qrup */
export async function GET() {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;
    const me = auth.user.id;
    const myGroups = (await prisma.groupMember.findMany({ where: { studentId: me }, select: { groupId: true } })).map((g) => g.groupId);
    if (!myGroups.length) return NextResponse.json({ assignments: [] });

    const list = await prisma.assignment.findMany({
      where: { groups: { some: { groupId: { in: myGroups } } }, exempts: { none: { studentId: me } }, package: { deletedAt: null } },
      select: { ...ASSIGNMENT_SELECT, teacher: { select: { name: true } }, rewards: { where: { studentId: me }, select: { coins: true } } },
      orderBy: { deadline: "asc" },
    });
    const now = Date.now();
    const out = [];
    for (const a of list) {
      const n = (await countedAttempts(a, [me])).get(me)?.length ?? 0;
      const groupId = a.groups.find((g) => myGroups.includes(g.groupId))?.groupId ?? null;
      out.push({
        id: a.id,
        package: { id: a.package.id, name: a.package.name, isBank: a.package.isBank },
        minAttempts: a.minAttempts,
        deadline: a.deadline,
        createdAt: a.createdAt,
        coinReward: a.coinReward,
        coinsGot: a.rewards[0]?.coins ?? 0,
        note: a.note,
        teacher: a.teacher.name,
        count: Math.min(n, a.minAttempts),
        status: statusOf(n, a.minAttempts, a.deadline, now),
        active: a.deadline.getTime() > now,
        href: groupId ? `/student/groups/${groupId}?tab=tests&pkg=${a.package.id}` : "/student/my-tests",
      });
    }
    return NextResponse.json({ assignments: out });
  } catch (error) {
    return serverError(error);
  }
}
