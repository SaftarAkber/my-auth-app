import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canSeePost, siblingMap } from "@/lib/posts";

type Ctx = { params: Promise<{ commentId: string }> };

// Şərhi bəyən / bəyənməni geri al
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { commentId } = await params;

    const c = await prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true } });
    if (!c) return notFound("Şərh tapılmadı");
    const rows = (await siblingMap([c.postId])).get(c.postId) ?? [];
    if (!(await canSeePost(user, rows))) return forbidden();

    const existing = await prisma.postCommentLike.findUnique({ where: { commentId_userId: { commentId, userId: user.id } } });
    if (existing) await prisma.postCommentLike.deleteMany({ where: { id: existing.id } });
    else await prisma.postCommentLike.create({ data: { commentId, userId: user.id } }).catch(() => null);

    const likes = await prisma.postCommentLike.count({ where: { commentId, user: { deletedAt: null } } });
    return NextResponse.json({ liked: !existing, likes });
  } catch (error) {
    return serverError(error);
  }
}
