import { prisma } from "@/lib/prisma";
import { countsForRanking } from "@/lib/attempts";
import { InsufficientCoins, transferCoins } from "@/lib/coins";

/**
 * Ev tapşırıqları: kimə aiddir, hansı cəhdlər sayılır, coin.
 * Sayılan cəhd: tapşırıq verildikdən SONRA başlanıb, son tarixə qədər bitib, sualların ən azı yarısı cavablanıb.
 * Son tarixdən sonrakı cəhdlər tapşırıqda heç görünmür (say dondurulur).
 */

export const ASSIGNMENT_SELECT = {
  id: true, teacherId: true, packageId: true, minAttempts: true, deadline: true, coinReward: true, note: true, createdAt: true,
  package: { select: { id: true, name: true, isBank: true, isMonthly: true, deletedAt: true } },
  groups: { select: { groupId: true, group: { select: { id: true, name: true } } } },
  exempts: { select: { studentId: true } },
} as const;

export type AssignmentRow = {
  id: string; teacherId: string; packageId: string; minAttempts: number; deadline: Date; coinReward: number | null; createdAt: Date;
  groups: { groupId: string }[]; exempts: { studentId: string }[];
};

/** Tapşırığın tələbələri: qrup üzvləri − azad edilənlər (silinmiş hesablar yox) */
export async function assignmentStudents(a: AssignmentRow) {
  const members = await prisma.groupMember.findMany({
    where: { groupId: { in: a.groups.map((g) => g.groupId) }, student: { deletedAt: null } },
    select: { groupId: true, student: { select: { id: true, name: true, photo: true } } },
  });
  const exempt = new Set(a.exempts.map((e) => e.studentId));
  const map = new Map<string, { id: string; name: string; photo: string | null; groupIds: string[] }>();
  for (const m of members) {
    if (exempt.has(m.student.id)) continue;
    const s = map.get(m.student.id) ?? { ...m.student, groupIds: [] };
    s.groupIds.push(m.groupId);
    map.set(m.student.id, s);
  }
  return [...map.values()];
}

/** Tapşırığa sayılan cəhdlər (tələbə üzrə) */
export async function countedAttempts(a: AssignmentRow, studentIds: string[]) {
  if (!studentIds.length) return new Map<string, { id: string; score: number | null; totalScore: number | null; finishedAt: Date }[]>();
  const rows = await prisma.studentAttempt.findMany({
    where: {
      packageId: a.packageId,
      studentId: { in: studentIds },
      startedAt: { gte: a.createdAt },
      finishedAt: { not: null, lte: a.deadline },
    },
    select: { id: true, studentId: true, score: true, totalScore: true, finishedAt: true, _count: { select: { answers: true } } },
    orderBy: { finishedAt: "asc" },
  });
  const out = new Map<string, { id: string; score: number | null; totalScore: number | null; finishedAt: Date }[]>();
  for (const r of rows) {
    if (!countsForRanking(r._count.answers, r.totalScore)) continue;
    out.set(r.studentId, [...(out.get(r.studentId) ?? []), { id: r.id, score: r.score, totalScore: r.totalScore, finishedAt: r.finishedAt! }]);
  }
  return out;
}

export type Status = "done" | "pending" | "overdue";
export const statusOf = (count: number, min: number, deadline: Date, now = Date.now()): Status =>
  count >= min ? "done" : deadline.getTime() < now ? "overdue" : "pending";

/**
 * Tələbə bu paketdə test bitirəndə çağırılır: vaxtı bitməmiş tapşırığı indi tamamlayıbsa və coin təyin olunubsa,
 * müəllimin balansından bir dəfə verilir (balans çatmasa – verilmir, sonrakı yoxlamada yenə cəhd olunur).
 */
export async function settleAssignments(studentId: string, packageId: string) {
  const now = new Date();
  const list = await prisma.assignment.findMany({
    where: {
      packageId,
      coinReward: { gt: 0 },
      deadline: { gte: now },
      groups: { some: { group: { members: { some: { studentId } } } } },
      exempts: { none: { studentId } },
      rewards: { none: { studentId } },
    },
    select: { ...ASSIGNMENT_SELECT },
  });
  for (const a of list) {
    const n = (await countedAttempts(a, [studentId])).get(studentId)?.length ?? 0;
    if (n < a.minAttempts || !a.coinReward) continue;
    try {
      await prisma.$transaction(async (tx) => {
        // Əvvəl qeyd: paralel çağırışda iki dəfə verilməsin
        await tx.assignmentReward.create({ data: { assignmentId: a.id, studentId, coins: a.coinReward! } });
        await transferCoins({ fromId: a.teacherId, toId: studentId, amount: a.coinReward!, reason: `Tapşırıq: ${a.package.name}`, tx });
      });
    } catch (e) {
      if (!(e instanceof InsufficientCoins) && !(e as { code?: string }).code?.startsWith("P2002")) console.error("Tapşırıq coin xətası:", e);
    }
  }
}
