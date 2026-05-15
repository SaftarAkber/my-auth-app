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
    const { title, description, url, visibility, groupIds, packageId, isActive } = await req.json();

    // Önce mevcut videoGroups'u sil
    await prisma.videoGroup.deleteMany({
      where: { videoId: id },
    });

    const video = await prisma.video.update({
      where: { id, teacherId: currentUser.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(url && { url }),
        ...(visibility && { visibility }),
        ...(packageId !== undefined && { packageId: packageId || null }),
        ...(isActive !== undefined && { isActive }),
        videoGroups: visibility === "GROUP_ONLY" && groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({ groupId })),
            }
          : undefined,
      },
      include: {
        videoGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ video });
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
    await prisma.video.delete({ where: { id, teacherId: currentUser.id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}