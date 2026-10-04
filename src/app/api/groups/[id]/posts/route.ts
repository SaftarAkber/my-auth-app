import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroup } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: groupId } = await params;
    if (!(await teacherOwnsGroup(auth.user.id, groupId))) return forbidden();

    const { content, images, visibility } = await req.json();
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });
    }

    const post = await prisma.groupPost.create({
      data: {
        content: String(content).trim(),
        groupId,
        teacherId: auth.user.id,
        visibility: visibility === "PUBLIC" ? "PUBLIC" : "GROUP",
        images: images?.length ? { create: images.map((url: string) => ({ url })) } : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: groupId } = await params;
    const postId = new URL(req.url).searchParams.get("postId");
    if (!postId) return NextResponse.json({ error: "Post ID lazımdır" }, { status: 400 });

    const result = await prisma.groupPost.deleteMany({
      where: { id: postId, groupId, teacherId: auth.user.id },
    });
    if (result.count === 0) return forbidden();
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
