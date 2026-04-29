import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            student: {
              select: { id: true, name: true, photo: true, email: true, phone: true },
            },
          },
        },
        posts: {
          include: { images: true },
          orderBy: { createdAt: "desc" },
        },
        videoPackages: {
          include: {
            videos: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
        },
        testPackages: {
          where: { isPublished: true },
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!group) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    return NextResponse.json({ group });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, schedule, photo, coverPhoto, isActive } = await req.json();

    const group = await prisma.group.update({
      where: { id, teacherId: currentUser.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(schedule !== undefined && { schedule }),
        ...(photo !== undefined && { photo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ group });
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
    await prisma.group.delete({ where: { id, teacherId: currentUser.id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}