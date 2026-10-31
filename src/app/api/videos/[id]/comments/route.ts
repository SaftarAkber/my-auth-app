import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canWatchVideo } from "@/lib/videoAccess";

type Ctx = { params: Promise<{ id: string }> };

const USER_SELECT = { id: true, name: true, photo: true, role: true } as const;
const PAGE = 5;

// Şərhlər: əsas şərhlər yeni → köhnə, cavablar köhnə → yeni. 5-5 səhifələnir ("Daha çox").
// GET /api/videos/:id/comments?cursor=…            — əsas şərhlər
// GET /api/videos/:id/comments?parentId=…&cursor=… — bir şərhin cavabları
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id: videoId } = await params;

    const access = await canWatchVideo(user, videoId);
    if (!access.exists) return notFound();
    if (!access.allowed) return forbidden();

    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(PAGE), 10) || PAGE));

    // Qrup-məxfi şərhləri yalnız qrup üzvləri, video sahibi və admin görür
    const seeAll = access.groupAccess || user.role === "ADMIN";
    const vis = seeAll ? {} : { visibility: "PUBLIC" as const };

    const rows = await prisma.videoComment.findMany({
      where: { videoId, parentId: parentId ?? null, ...vis },
      include: {
        user: { select: USER_SELECT },
        _count: { select: { replies: { where: vis } } },
      },
      orderBy: { createdAt: parentId ? "asc" : "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const total = await prisma.videoComment.count({ where: { videoId, ...vis } });

    return NextResponse.json({
      comments: page.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        visibility: c.visibility,
        parentId: c.parentId,
        user: c.user,
        replyCount: c._count.replies,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      total,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();

    const { id: videoId } = await params;
    const { content, visibility, parentId } = await req.json();
    const text = String(content ?? "").trim();
    if (!text) return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: "Şərh çox uzundur" }, { status: 400 });

    const access = await canWatchVideo(user, videoId);
    if (!access.exists) return notFound();
    if (!access.allowed) return forbidden();

    let vis: "PUBLIC" | "GROUP_ONLY" = visibility === "GROUP_ONLY" ? "GROUP_ONLY" : "PUBLIC";
    // Qrup-məxfi şərh yalnız qrup üzvü/müəllim yaza bilər
    if (vis === "GROUP_ONLY" && !access.groupAccess) return forbidden();

    let topId: string | null = null;
    let body = text;
    if (parentId) {
      const parent = await prisma.videoComment.findFirst({
        where: { id: String(parentId), videoId },
        include: { user: { select: { name: true } } },
      });
      if (!parent) return notFound("Şərh tapılmadı");
      if (parent.visibility === "GROUP_ONLY" && !access.groupAccess && user.role !== "ADMIN") return forbidden();
      // Yalnız bir səviyyə: cavaba cavab eyni əsas şərhin altına düşür, adı @ ilə qeyd olunur
      topId = parent.parentId ?? parent.id;
      if (parent.parentId && !text.startsWith("@")) body = `@${parent.user.name} ${text}`;
      // Qrup-məxfi şərhin cavabı həmişə qrup-məxfi qalır
      if (parent.visibility === "GROUP_ONLY") vis = "GROUP_ONLY";
    }

    const comment = await prisma.videoComment.create({
      data: { content: body, videoId, userId: user.id, visibility: vis, parentId: topId },
      include: { user: { select: USER_SELECT } },
    });

    return NextResponse.json(
      { comment: { id: comment.id, content: comment.content, createdAt: comment.createdAt, visibility: comment.visibility, parentId: comment.parentId, user: comment.user, replyCount: 0 } },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error);
  }
}

// DELETE /api/videos/:id/comments?commentId=… — şərh sahibi, video sahibi və admin silə bilər; cavablar da silinir
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
    if (comment.userId !== user.id && comment.video.teacherId !== user.id && user.role !== "ADMIN") return forbidden();

    await prisma.videoComment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
