import type { Prisma } from "@prisma/client";

/**
 * Kolleksiyanın hansı qruplara açıq olduğunu təyin edir.
 * - Siyahı boşdursa kolleksiya məhdudiyyətsizdir (əvvəlki kimi).
 * - Siyahı doludursa kolleksiya yalnız həmin qruplarda görünür; paketlər isə hər qrup üçün ayrıca dərc olunur
 *   (paket-qrup bağlantısı = həmin qrup üçün dərc).
 */
export async function setCollectionGroups(tx: Prisma.TransactionClient, collectionId: string, groupIds: string[]) {
  const ids = [...new Set(groupIds)];

  await tx.collectionGroup.deleteMany({ where: { collectionId, groupId: { notIn: ids } } });
  const existing = await tx.collectionGroup.findMany({ where: { collectionId }, select: { groupId: true } });
  const have = new Set(existing.map((e) => e.groupId));
  const added = ids.filter((g) => !have.has(g));
  if (added.length) await tx.collectionGroup.createMany({ data: added.map((groupId) => ({ collectionId, groupId })) });

  await tx.collection.update({
    where: { id: collectionId },
    data: { visibility: ids.length ? "GROUP_ONLY" : "PUBLIC" },
  });

  // Kolleksiyadan çıxarılan qruplarda paketlər də görünməsin
  await tx.testPackageGroup.deleteMany({ where: { package: { collectionId }, groupId: { notIn: ids } } });

  // Heç bir qrupa dərc olunmayan qrup-paketləri dərcdən çıxar (təsadüfən hamıya açıq qalmasın).
  // "Hamıya açıq" seçilmiş testlər isə müəllimin seçimi olaraq hamıya açıq qalır.
  await tx.testPackage.updateMany({
    where: { collectionId, visibility: "GROUP_ONLY", testPackageGroups: { none: {} } },
    data: { isPublished: false },
  });
}
