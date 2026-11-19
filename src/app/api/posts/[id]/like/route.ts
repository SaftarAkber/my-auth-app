import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canSeePost, siblingMap } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

// Bəyənməni aç/bağla (hər istifadəçi bir dəfə; bir neçə qrupa göndərilmiş paylaşım bir sayılır)
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const rows = (await siblingMap([id])).get(id) ?? [];
    if (rows.length === 0) return notFound();
    if (!(await canSeePost(user, rows))) return forbidden();
    const ids = rows.map((r) => r.id);

    const existing = await prisma.postLike.findMany({ where: { postId: { in: ids }, userId: user.id }, select: { id: true } });
    if (existing.length) await prisma.postLike.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });
    else await prisma.postLike.create({ data: { postId: id, userId: user.id } });

    const likers = await prisma.postLike.findMany({ where: { postId: { in: ids } }, select: { userId: true }, distinct: ["userId"] });
    return NextResponse.json({ liked: existing.length === 0, likes: likers.length });
  } catch (error) {
    return serverError(error);
  }
}
