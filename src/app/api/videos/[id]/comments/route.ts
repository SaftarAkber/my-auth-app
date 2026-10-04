import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

const USER_SELECT = { id: true, name: true, photo: true, role: true } as const;

/** İstifadəçinin bu videonun qrup məzmununa çıxışı varmı? */
async function hasGroupAccess(userId: string, videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      teacherId: true,
      package: { select: { groupId: true, videoPackageGroups: { select: { groupId: true } } } },
      videoGroups: { select: { groupId: true } },
    },
  });
  if (!video) return { exists: false, access: false };
  if (video.teacherId === userId) return { exists: true, access: true };

  const groupIds = [
    ...video.videoGroups.map((g) => g.groupId),
    ...(video.package?.videoPackageGroups.map((g) => g.groupId) ?? []),
    ...(video.package?.groupId ? [video.package.groupId] : []),
  ];
  const member = await prisma.groupMember.findFirst({
    where: { studentId: userId, groupId: { in: groupIds } },
    select: { id: true },
  });
  return { exists: true, access: !!member };
}

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id: videoId } = await params;
    const user = await optionalUser();

    const { exists, access } = user ? await hasGroupAccess(user.id, videoId) : await (async () => {
      const v = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
      return { exists: !!v, access: false };
    })();
    if (!exists) return notFound();

    const comments = await prisma.videoComment.findMany({
      where: { videoId, ...(access ? {} : { visibility: "PUBLIC" }) },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ comments });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();

    const { id: videoId } = await params;
    const { content, visibility } = await req.json();
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });
    }

    const { exists, access } = await hasGroupAccess(user.id, videoId);
    if (!exists) return notFound();
    // Qrup-məxfi şərh yalnız qrup üzvü/müəllim yaza bilər
    if (visibility === "GROUP_ONLY" && !access) return forbidden();

    const comment = await prisma.videoComment.create({
      data: {
        content: String(content).trim(),
        videoId,
        userId: user.id,
        visibility: visibility === "GROUP_ONLY" ? "GROUP_ONLY" : "PUBLIC",
      },
      include: { user: { select: USER_SELECT } },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

// DELETE /api/videos/:id/comments?commentId=...  — öz şərhini və ya video sahibi silir
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();

    const { id: videoId } = await params;
    const commentId = new URL(req.url).searchParams.get("commentId");
    if (!commentId) return NextResponse.json({ error: "Şərh ID lazımdır" }, { status: 400 });

    const comment = await prisma.videoComment.findFirst({
      where: { id: commentId, videoId },
      include: { video: { select: { teacherId: true } } },
    });
    if (!comment) return notFound();
    if (comment.userId !== user.id && comment.video.teacherId !== user.id) return forbidden();

    await prisma.videoComment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
