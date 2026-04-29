import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Koleksiyonları getir
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const collections = await prisma.collection.findMany({
      where: { teacherId: currentUser.id },
      include: {
        _count: { select: { packages: true, videoPackages: true } },
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

    const { name, description } = await req.json();
    if (!name)
      return NextResponse.json({ error: "İsim zorunludur" }, { status: 400 });

    const collection = await prisma.collection.create({
      data: { name, description, teacherId: currentUser.id },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
