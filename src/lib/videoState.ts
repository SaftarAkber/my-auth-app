import type { Prisma } from "@prisma/client";
import type { VideoState } from "@/lib/videoAccess";

export const isVideoState = (s: unknown): s is VideoState => s === "draft" || s === "public" || s === "groups";

/** Bir və ya bir neçə videonun vəziyyətini dəyişir (qaralama / hamıya açıq / seçilmiş qruplar). */
export async function applyVideoState(
  tx: Prisma.TransactionClient,
  videoIds: string[],
  state: VideoState,
  groupIds: string[],
) {
  if (videoIds.length === 0) return;
  if (state === "draft") {
    await tx.video.updateMany({ where: { id: { in: videoIds } }, data: { isPublished: false } });
    return;
  }
  await tx.videoGroup.deleteMany({ where: { videoId: { in: videoIds } } });
  if (state === "public") {
    await tx.video.updateMany({ where: { id: { in: videoIds } }, data: { isPublished: true, visibility: "PUBLIC" } });
    return;
  }
  await tx.video.updateMany({ where: { id: { in: videoIds } }, data: { isPublished: true, visibility: "GROUP_ONLY" } });
  const ids = [...new Set(groupIds)];
  await tx.videoGroup.createMany({
    data: videoIds.flatMap((videoId) => ids.map((groupId) => ({ videoId, groupId }))),
    skipDuplicates: true,
  });
}
