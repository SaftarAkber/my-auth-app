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
    const { text, type, options, correctAnswer, order } = await req.json();

    if (!text || !type) {
      return NextResponse.json({ error: "Soru metni ve tipi zorunludur" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        text,
        type,
        options: options || null,
        correctAnswer: correctAnswer || null,
        order: order || 0,
        packageId,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}