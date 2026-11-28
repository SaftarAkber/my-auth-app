import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canSeePost, siblingMap } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

const USER_SELECT = { id: true, name: true, photo: true, role: true, deletedAt: true } as const;

/** Silinmiş hesabın şərhi yalnız paylaşımın müəllimi və adminə görünür, adının yanında "(silinib)" */
const showUser = (u: { id: string; name: string; photo: string | null; role: string; deletedAt: Date | null }) => ({
  id: u.id, name: u.deletedAt ? `${u.name} (silinib)` : u.name, photo: u.photo, role: u.role,
});
const PAGE = 5;

/** Paylaşımın bütün qardaş sətirləri və baxanın girişi */
async function access(user: { id: string; role: string }, id: string) {
  const rows = (await siblingMap([id])).get(id) ?? [];
  if (rows.length === 0) return { status: "missing" as const };
  if (!(await canSeePost(user, rows))) return { status: "forbidden" as const };
  return { status: "ok" as const, ids: rows.map((r) => r.id), teacherId: rows[0].teacherId };
}

// Şərhlər videodakı kimi: əsas şərhlər yeni → köhnə, cavablar köhnə → yeni, 5-5 səhifələnir.
// GET /api/posts/:id/comments?cursor=…            — əsas şərhlər
// GET /api/posts/:id/comments?parentId=…&cursor=… — bir şərhin cavabları
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const a = await access(user, id);
    if (a.status === "missing") return notFound();
    if (a.status === "forbidden") return forbidden();

    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(PAGE), 10) || PAGE));

    const staff = user.role === "ADMIN" || a.teacherId === user.id;
    const live = staff ? {} : { user: { deletedAt: null } };
    const rows = await prisma.postComment.findMany({
      where: { postId: { in: a.ids }, parentId: parentId ?? null, ...live },
      include: {
        user: { select: USER_SELECT },
        _count: { select: { replies: { where: live }, likes: { where: { user: { deletedAt: null } } } } },
        likes: { where: { userId: user.id }, select: { id: true } },
      },
      orderBy: [{ createdAt: parentId ? "asc" : "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    // Sayğac yalnız əsas şərhləri sayır (cavablar daxil deyil)
    const total = await prisma.postComment.count({ where: { postId: { in: a.ids }, parentId: null, ...live } });

    return NextResponse.json({
      comments: page.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        visibility: "PUBLIC",
        parentId: c.parentId,
        user: showUser(c.user),
        replyCount: c._count.replies,
        likes: c._count.likes,
        liked: c.likes.length > 0,
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
    const { id } = await params;
    const { content, parentId } = await req.json();
    const text = String(content ?? "").trim();
    if (!text) return NextResponse.json({ error: "Məzmun məcburidir" }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: "Şərh çox uzundur" }, { status: 400 });

    const a = await access(user, id);
    if (a.status === "missing") return notFound();
    if (a.status === "forbidden") return forbidden();

    let topId: string | null = null;
    let body = text;
    let postId = id;
    if (parentId) {
      const parent = await prisma.postComment.findFirst({
        where: { id: String(parentId), postId: { in: a.ids } },
        include: { user: { select: { name: true } } },
      });
      if (!parent) return notFound("Şərh tapılmadı");
      // Yalnız bir səviyyə: cavaba cavab eyni əsas şərhin altına düşür, adı @ ilə qeyd olunur
      topId = parent.parentId ?? parent.id;
      postId = parent.postId;
      if (parent.parentId && !text.startsWith("@")) body = `@${parent.user.name} ${text}`;
    }

    const c = await prisma.postComment.create({
      data: { content: body, postId, userId: user.id, parentId: topId },
      include: { user: { select: USER_SELECT } },
    });
    return NextResponse.json(
      { comment: { id: c.id, content: c.content, createdAt: c.createdAt, visibility: "PUBLIC", parentId: c.parentId, user: showUser(c.user), replyCount: 0, likes: 0, liked: false } },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error);
  }
}

// DELETE /api/posts/:id/comments?commentId=… — şərh sahibi, paylaşımın müəllimi və admin silə bilər; cavablar da silinir
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const commentId = new URL(req.url).searchParams.get("commentId");
    if (!commentId) return NextResponse.json({ error: "Şərh ID lazımdır" }, { status: 400 });

    const a = await access(user, id);
    if (a.status === "missing") return notFound();
    if (a.status === "forbidden") return forbidden();

    const c = await prisma.postComment.findFirst({ where: { id: commentId, postId: { in: a.ids } } });
    if (!c) return notFound();
    if (c.userId !== user.id && a.teacherId !== user.id && user.role !== "ADMIN") return forbidden();

    await prisma.postComment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
