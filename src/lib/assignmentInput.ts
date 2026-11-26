import { prisma } from "@/lib/prisma";
import { teacherOwnsGroups, teacherOwnsTestPackage } from "@/lib/guards";

/** Tapşırıq formasının yoxlanması (yaratma və redaktə üçün ortaq) */
export async function cleanAssignmentInput(b: Record<string, unknown>, teacherId: string, { partial = false } = {}) {
  const out: {
    packageId?: string; minAttempts?: number; deadline?: Date; coinReward?: number | null; note?: string | null;
    groups?: { groupId: string; exempt: string[] }[];
  } = {};

  if (!partial || b.packageId !== undefined) {
    const packageId = typeof b.packageId === "string" ? b.packageId : "";
    if (!packageId || !(await teacherOwnsTestPackage(teacherId, packageId))) return { error: "Test paketi seçin" };
    out.packageId = packageId;
  }
  if (!partial || b.minAttempts !== undefined) {
    const n = Math.floor(Number(b.minAttempts ?? 1));
    if (!Number.isFinite(n) || n < 1 || n > 50) return { error: "Test sayı 1 ilə 50 arasında olmalıdır" };
    out.minAttempts = n;
  }
  if (!partial || b.deadline !== undefined) {
    const d = new Date(String(b.deadline ?? ""));
    if (Number.isNaN(d.getTime())) return { error: "Son tarixi seçin" };
    out.deadline = d;
  }
  if (b.coinReward !== undefined) {
    if (b.coinReward === null || b.coinReward === "") out.coinReward = null;
    else {
      const c = Math.floor(Number(b.coinReward));
      if (!Number.isFinite(c) || c < 0 || c > 100000) return { error: "Coin 0 ilə 100000 arasında olmalıdır" };
      out.coinReward = c || null;
    }
  }
  if (b.note !== undefined) out.note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : null;

  if (!partial || b.groups !== undefined) {
    const raw = Array.isArray(b.groups) ? b.groups : [];
    const groups = raw
      .filter((g): g is { groupId: string; exempt?: unknown } => !!g && typeof (g as { groupId?: unknown }).groupId === "string")
      .map((g) => ({ groupId: g.groupId, exempt: Array.isArray(g.exempt) ? g.exempt.filter((x): x is string => typeof x === "string") : [] }));
    if (!groups.length) return { error: "Ən azı bir qrup seçin" };
    if (!(await teacherOwnsGroups(teacherId, groups.map((g) => g.groupId)))) return { error: "Qrup tapılmadı" };
    // Azad edilənlər yalnız həmin qrupun üzvləri ola bilər
    const members = await prisma.groupMember.findMany({ where: { groupId: { in: groups.map((g) => g.groupId) } }, select: { groupId: true, studentId: true } });
    const inGroup = new Set(members.map((m) => `${m.groupId}:${m.studentId}`));
    out.groups = groups.map((g) => ({ groupId: g.groupId, exempt: g.exempt.filter((s) => inGroup.has(`${g.groupId}:${s}`)) }));
  }
  return { data: out };
}
