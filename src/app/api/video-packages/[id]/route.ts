import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, isPublished, visibility, groupIds } = await req.json();

    // Önce mevcut groups'u sil
    await prisma.videoPackageGroup.deleteMany({
      where: { packageId: id },
    });

    const pkg = await prisma.videoPackage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
        ...(visibility !== undefined && { visibility }),
        videoPackageGroups: visibility === "GROUP_ONLY" && groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({ groupId })),
            }
          : undefined,
      },
      include: {
        videoPackageGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

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
    await prisma.videoPackage.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}