import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Videonun vəziyyəti (hər videonun özündə):
 *   draft  — qaralama, heç kim görmür (yalnız sahibi)
 *   public — hamıya açıq (isPublished + visibility PUBLIC)
 *   groups — seçilmiş qruplara (isPublished + visibility GROUP_ONLY + videoGroups)
 * Paket yalnız qovluqdur: tələbə paketdə yalnız ona açıq videoları görür (hamıya açıq + öz qrupları).
 */
type ViewerLite = { id: string; role: string };

export type VideoState = "draft" | "public" | "groups";

export const stateOf = (v: { isPublished: boolean; visibility: "PUBLIC" | "GROUP_ONLY" }): VideoState =>
  !v.isPublished ? "draft" : v.visibility === "PUBLIC" ? "public" : "groups";

/** İstifadəçinin üzv olduğu qrup ID-ləri (yalnız tələbə üçün) */
export async function myGroupIds(user: ViewerLite): Promise<string[]> {
  if (user.role !== "STUDENT") return [];
  const rows = await prisma.groupMember.findMany({ where: { studentId: user.id }, select: { groupId: true } });
  return rows.map((r) => r.groupId);
}

/** İzləyiciyə açıq olan videolar (dərc olunmuş, aktiv; hamıya açıq, sancılmış və ya öz qrupları) */
export function visibleVideoWhere(groupIds: string[]): Prisma.VideoWhereInput {
  return {
    isActive: true,
    isPublished: true,
    OR: [
      { visibility: "PUBLIC" },
      { pinOrder: { not: null } },
      ...(groupIds.length ? [{ videoGroups: { some: { groupId: { in: groupIds } } } }] : []),
    ],
  };
}

/** Yalnız hamıya açıq (qlobal) videolar */
export const publicVideoWhere: Prisma.VideoWhereInput = {
  isActive: true,
  isPublished: true,
  OR: [{ visibility: "PUBLIC" }, { pinOrder: { not: null } }],
};

/** Bu istifadəçi bu videonu izləyə bilərmi? */
export async function canWatchVideo(user: ViewerLite, videoId: string) {
  const v = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, teacherId: true, isActive: true, isPublished: true, visibility: true, pinOrder: true, videoGroups: { select: { groupId: true } } },
  });
  if (!v) return { exists: false as const, allowed: false, owner: false, groupAccess: false };
  const owner = v.teacherId === user.id;
  if (user.role === "ADMIN" || owner) return { exists: true as const, allowed: true, owner, groupAccess: true };
  if (!v.isActive || !v.isPublished) return { exists: true as const, allowed: false, owner: false, groupAccess: false };

  const gids = await myGroupIds(user);
  const groupAccess = v.videoGroups.some((g) => gids.includes(g.groupId));
  const allowed = v.visibility === "PUBLIC" || v.pinOrder !== null || groupAccess;
  return { exists: true as const, allowed, owner: false, groupAccess };
}

/** Deterministik "təsadüfi" sıralama (səhifələmə zamanı siyahı dəyişməsin deyə seed ilə) */
export function seededOrder<T extends { id: string }>(items: T[], seed: string): T[] {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return (x >>> 0) / 4294967295;
  };
  return [...items].sort((a, b) => h(seed + a.id) - h(seed + b.id));
}
