import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { setCollectionGroups } from "@/lib/collectionGroups";
import { forbidden, teacherOwnsGroups } from "@/lib/guards";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const collection = await prisma.collection.findFirst({
      where: { id, teacherId: currentUser.id },
      include: {
        groups: { include: { group: { select: { id: true, name: true } } } },
        packages: {
          where: { deletedAt: null },
          include: {
            _count: { select: { questions: true, attempts: true } },
            group: { select: { id: true, name: true } },
            // qrup bağlantıları və isPublic üçün lazımdır
            testPackageGroups: {
              include: {
                group: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        videoPackages: {
          include: {
            videos: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collection)
      return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ collection });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, groupIds } = await req.json();

    const own = await prisma.collection.findFirst({ where: { id, teacherId: currentUser.id }, select: { id: true } });
    if (!own) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const gids: string[] | null = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : null;
    if (gids && !(await teacherOwnsGroups(currentUser.id, gids))) return forbidden();

    const collection = await prisma.$transaction(async (tx) => {
      const c = await tx.collection.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
      });
      if (gids) await setCollectionGroups(tx, id, gids);
      return c;
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Yumşaq silmə: kolleksiya və içindəki bütün test paketləri gizlədilir, admin bərpa edə bilir
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const own = await prisma.collection.findFirst({ where: { id, teacherId: currentUser.id }, select: { id: true } });
    if (!own) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const at = new Date();
    await prisma.$transaction([
      // Eyni vaxt damğası: bərpada kolleksiya ilə birlikdə silinənləri tanımaq üçün
      prisma.testPackage.updateMany({
        where: { collectionId: id, deletedAt: null },
        data: { deletedAt: at, deletedById: currentUser.id },
      }),
      prisma.collection.update({
        where: { id },
        data: { deletedAt: at, deletedById: currentUser.id },
      }),
    ]);
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
