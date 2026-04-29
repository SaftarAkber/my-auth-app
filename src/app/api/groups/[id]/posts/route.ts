import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { content, images, visibility } = await req.json();

    if (!content) return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });

    const post = await prisma.groupPost.create({
      data: {
        content,
        groupId,
        teacherId: currentUser.id,
        visibility: visibility || "GROUP",
        images: images?.length ? {
          create: images.map((url: string) => ({ url })),
        } : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    if (!postId) return NextResponse.json({ error: "Post ID lazımdır" }, { status: 400 });

    await prisma.groupPost.delete({ where: { id: postId, teacherId: currentUser.id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}