import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: packageId } = await params;
    const { title, description, url, publicId, order } = await req.json();

    if (!title || !url) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        url,
        publicId: publicId || null,
        order: order || 0,
        teacherId: currentUser.id,
        packageId,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}