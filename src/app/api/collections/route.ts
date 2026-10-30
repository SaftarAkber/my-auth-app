import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { setCollectionGroups } from "@/lib/collectionGroups";
import { forbidden, teacherOwnsGroups } from "@/lib/guards";

// Koleksiyonları getir
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const collections = await prisma.collection.findMany({
      where: { teacherId: currentUser.id },
      include: {
        _count: { select: { packages: { where: { deletedAt: null } }, videoPackages: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Koleksiyon oluştur
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, description, groupIds } = await req.json();
    if (!name)
      return NextResponse.json({ error: "İsim zorunludur" }, { status: 400 });
    const gids: string[] = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : [];
    if (!(await teacherOwnsGroups(currentUser.id, gids))) return forbidden();

    const collection = await prisma.$transaction(async (tx) => {
      const c = await tx.collection.create({
        data: { name, description, teacherId: currentUser.id },
      });
      if (gids.length) await setCollectionGroups(tx, c.id, gids);
      return c;
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
