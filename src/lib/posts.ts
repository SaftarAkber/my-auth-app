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
