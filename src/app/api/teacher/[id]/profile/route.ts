import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const teacher = await prisma.user.findUnique({
      where: { id, role: "TEACHER" },
      select: {
        id: true, name: true, bio: true, photo: true, email: true, phone: true,
        collections: {
          include: {
            packages: {
              where: { isPublished: true },
              include: {
                _count: { select: { questions: true } },
              },
            },
            // ✅ videos → videoPackages.videos olarak değişti
            videoPackages: {
              include: {
                videos: {
                  where: { isActive: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    
    if (!teacher) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ teacher });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}