import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        collection: { select: { name: true, teacherId: true } },
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
    const { name, description, isPublished, isTimed, duration, startsAt, endsAt } = await req.json();

    const pkg = await prisma.testPackage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
        ...(isTimed !== undefined && { isTimed }),
        ...(duration !== undefined && { duration }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      },
    });

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
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