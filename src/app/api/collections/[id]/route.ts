import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        packages: {
          include: {
            _count: { select: { questions: true, attempts: true } },
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
    const { name, description } = await req.json();

    const collection = await prisma.collection.update({
      where: { id, teacherId: currentUser.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

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
    await prisma.collection.delete({
      where: { id, teacherId: currentUser.id },
    });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
