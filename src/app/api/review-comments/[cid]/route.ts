import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { cleanCommentInput, COMMENT_SELECT } from "@/lib/reviewComments";

type Ctx = { params: Promise<{ cid: string }> };

async function own(cid: string) {
  const user = await optionalUser();
  if (!user) return { res: unauthorized() };
  const c = await prisma.reviewComment.findUnique({ where: { id: cid }, select: { id: true, teacherId: true } });
  if (!c) return { res: notFound() };
  if (c.teacherId !== user.id && user.role !== "ADMIN") return { res: forbidden() };
  return { user, c };
}

/** Şərhi redaktə et (göndərilmişsə dəyişiklik dərhal görünür, yeni bildiriş getmir) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { cid } = await params;
    const o = await own(cid);
    if ("res" in o) return o.res;
    const b = await req.json().catch(() => ({}));
    const c = await cleanCommentInput(b, o.c.teacherId);
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const comment = await prisma.reviewComment.update({ where: { id: cid }, data: c.data, select: COMMENT_SELECT });
    return NextResponse.json({ comment });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { cid } = await params;
    const o = await own(cid);
    if ("res" in o) return o.res;
    await prisma.reviewComment.delete({ where: { id: cid } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
