import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const packages = await prisma.videoPackage.findMany({
      where: { teacherId: currentUser.id },
      include: {
        videos: {
          select: { id: true, title: true, url: true },
          orderBy: { order: "asc" },
        },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, description, groupId, visibility } = await req.json();
    if (!name) return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });

    const pkg = await prisma.videoPackage.create({
      data: {
        name,
        description: description || null,
        groupId: groupId || null,
        visibility: visibility || "PUBLIC",
        teacherId: currentUser.id, // ✅ teacherId ekle
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}