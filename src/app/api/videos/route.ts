import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: { teacherId: currentUser.id },
      include: {
        package: {
          select: {
            name: true,
            collection: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    // collectionId → packageId olarak değişti
    const { title, description, url, packageId, order } = await req.json();

    if (!title || !url) {
      return NextResponse.json({ error: "Başlık ve URL zorunludur" }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        title,
        description,
        url,
        packageId: packageId || null, // collectionId → packageId
        order: order || 0,
        teacherId: currentUser.id,
      },
      include: {
        package: {
          select: {
            name: true,
            collection: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}