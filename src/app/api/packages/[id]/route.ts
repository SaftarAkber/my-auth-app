import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { adjustCoins } from "@/lib/coins";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        collection: { select: { name: true, teacherId: true } },
        testPackageGroups: {
          include: { group: { select: { id: true, name: true } } },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!pkg) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const {
      name, description, isPublished, isPublic,
      isTimed, duration, startsAt, endsAt,
      visibility, groupIds, allowRetry,
    } = await req.json();

    // ⬇️ YENİ — coin vermədən əvvəl mövcud vəziyyəti yoxlayırıq
    const existing = await prisma.testPackage.findUnique({ where: { id } });

    // Əvvəlki qrup bağlantılarını sil
    await prisma.testPackageGroup.deleteMany({ where: { packageId: id } });

    const pkg = await prisma.testPackage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isTimed !== undefined && { isTimed }),
        ...(duration !== undefined && { duration }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
        ...(visibility !== undefined && { visibility }),
        ...(allowRetry !== undefined && { allowRetry }),
        // Multi-group bağlantılar
        testPackageGroups: groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({ groupId })),
            }
          : undefined,
      },
      include: {
        testPackageGroups: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    });

    // ⬇️ YENİ — müəllim testi ilk dəfə yayımlayanda 5 coin
    if (isPublished === true && existing && !existing.isPublished) {
      try {
        await adjustCoins(
          currentUser.id,
          5,
          "TEST_CREATED",
          `"${pkg.name}" yayımlandı`
        );
      } catch (coinErr) {
        console.error("Coin vermə xətası:", coinErr);
        // testin yayımlanmasını bloklamırıq, sadəcə log yazırıq
      }
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.testPackage.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}