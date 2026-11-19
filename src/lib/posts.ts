import { prisma } from "@/lib/prisma";

/**
 * Bir paylaşım bir neçə qrupa göndəriləndə hər qrup üçün ayrıca sətir yazılır (eyni müəllim, mətn və createdAt).
 * Qrup səhifəsi öz sətrini göstərir; profil və tələbə lenti kimi bir neçə qrupu birlikdə göstərən yerlərdə
 * bu sətirlər bir karta yığılır: `groups` – paylaşımın getdiyi (və baxana görünən) qruplar, `ids` – bütün sətirlər.
 */
export function batchKey(p: { teacherId: string; content: string; createdAt: Date | string }) {
  return `${p.teacherId}|${new Date(p.createdAt).toISOString()}|${p.content}`;
}

export function collapsePosts<T extends { id: string; teacherId: string; content: string; createdAt: Date | string; group: { id: string; name: string } }>(
  rows: T[],
): (T & { groups: { id: string; name: string }[]; ids: string[] })[] {
  const out = new Map<string, T & { groups: { id: string; name: string }[]; ids: string[] }>();
  for (const r of rows) {
    const k = batchKey(r);
    const hit = out.get(k);
    if (hit) {
      hit.ids.push(r.id);
      if (!hit.groups.some((g) => g.id === r.group.id)) hit.groups.push(r.group);
    } else {
      out.set(k, { ...r, groups: [r.group], ids: [r.id] });
    }
  }
  return [...out.values()];
}

/* ───────── Bəyənmələr ───────── */

type Viewer = { id: string; role: string };

/** Verilən paylaşım sətirlərinin hər biri üçün bütün qardaş sətirlər (eyni müəllim, mətn və createdAt) */
export async function siblingMap(ids: string[]) {
  const base = await prisma.groupPost.findMany({
    where: { id: { in: ids } },
    select: { id: true, teacherId: true, content: true, createdAt: true },
  });
  if (base.length === 0) return new Map<string, { id: string; groupId: string; visibility: string; teacherId: string }[]>();
  const all = await prisma.groupPost.findMany({
    where: { OR: base.map((b) => ({ teacherId: b.teacherId, createdAt: b.createdAt })) },
    select: { id: true, teacherId: true, content: true, createdAt: true, groupId: true, visibility: true },
  });
  const byKey = new Map<string, typeof all>();
  for (const r of all) {
    const k = batchKey(r);
    byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  return new Map(base.map((b) => [b.id, byKey.get(batchKey(b)) ?? []]));
}

/** Baxan bu paylaşımı görə bilərmi (hər hansı qardaş sətir üzrə) */
export async function canSeePost(user: Viewer, rows: { groupId: string; visibility: string; teacherId: string }[]) {
  if (rows.length === 0) return false;
  if (user.role === "ADMIN" || rows.some((r) => r.teacherId === user.id || r.visibility === "PUBLIC")) return true;
  const n = await prisma.groupMember.count({ where: { studentId: user.id, groupId: { in: rows.map((r) => r.groupId) } } });
  return n > 0;
}
