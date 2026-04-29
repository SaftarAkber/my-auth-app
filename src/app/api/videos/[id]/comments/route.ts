import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params;
    const comments = await prisma.videoComment.findMany({
      where: { videoId },
      include: {
        user: { select: { id: true, name: true, photo: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ comments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: videoId } = await params;
    const { content, visibility } = await req.json();

    if (!content) return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });

    const comment = await prisma.videoComment.create({
      data: {
        content,
        videoId,
        userId: currentUser.id,
        visibility: visibility || "PUBLIC",
      },
      include: {
        user: { select: { id: true, name: true, photo: true, role: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}