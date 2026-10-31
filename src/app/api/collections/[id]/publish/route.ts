import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, teacherOwnsGroups } from "@/lib/guards";

// Qısayol: kolleksiyadakı bütün testləri birdən eyni vəziyyətə keçirir (qaralama / hamıya açıq / seçilmiş qruplar).
// Sualı olmayan testlər dərc olunmur (atlanır).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const { id } = await params;
    const { state, groupIds } = await req.json();
    if (state !== "draft" && state !== "public" && state !== "groups") {
      return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
    }

    const col = await prisma.collection.findFirst({
      where: { id, teacherId: currentUser.id },
      select: { visibility: true, groups: { select: { groupId: true } } },
    });
    if (!col) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const gids: string[] = Array.isArray(groupIds) ? [...new Set<string>(groupIds.filter((g: unknown) => typeof g === "string"))] : [];
    if (state === "groups") {
      if (gids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
      if (!(await teacherOwnsGroups(currentUser.id, gids))) return forbidden();
      if (col.visibility === "GROUP_ONLY") {
        const allowed = new Set(col.groups.map((g) => g.groupId));
        if (gids.some((g) => !allowed.has(g))) return NextResponse.json({ error: "Qrup bu kolleksiyaya açıq deyil" }, { status: 400 });
      }
    }

    const pkgs = await prisma.testPackage.findMany({
      where: { collectionId: id },
      select: { id: true, _count: { select: { questions: true } } },
    });
    const usable = state === "draft" ? pkgs : pkgs.filter((p) => p._count.questions > 0);
    const ids = usable.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      if (ids.length === 0) return;
      if (state === "draft") {
        await tx.testPackage.updateMany({ where: { id: { in: ids } }, data: { isPublished: false } });
        return;
      }
      await tx.testPackageGroup.deleteMany({ where: { packageId: { in: ids } } });
      if (state === "public") {
        await tx.testPackage.updateMany({ where: { id: { in: ids } }, data: { isPublished: true, visibility: "PUBLIC", isPublic: true } });
        return;
      }
      await tx.testPackage.updateMany({ where: { id: { in: ids } }, data: { isPublished: true, visibility: "GROUP_ONLY", isPublic: false } });
      await tx.testPackageGroup.createMany({
        data: ids.flatMap((packageId) => gids.map((groupId) => ({ packageId, groupId }))),
        skipDuplicates: true,
      });
    });

    return NextResponse.json({ updated: ids.length, skipped: pkgs.length - ids.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
