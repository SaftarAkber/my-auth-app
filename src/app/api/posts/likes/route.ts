import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optionalUser, serverError, unauthorized } from "@/lib/guards";
import { siblingMap } from "@/lib/posts";

// Bir neçə paylaşım üçün bəyənmə sayı və "mən bəyənmişəm" (?ids=a,b,c); kartlar bir sorğuda yığılır
export async function GET(req: NextRequest) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const ids = [...new Set((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean))].slice(0, 60);
    if (ids.length === 0) return NextResponse.json({ likes: {} });

    const sib = await siblingMap(ids);
    const allIds = [...new Set([...sib.values()].flat().map((r) => r.id))];
    const likes = allIds.length
      ? await prisma.postLike.findMany({ where: { postId: { in: allIds }, user: { deletedAt: null } }, select: { postId: true, userId: true } })
      : [];
    const comments = allIds.length
      ? await prisma.postComment.groupBy({ by: ["postId"], where: { postId: { in: allIds }, parentId: null, user: { deletedAt: null } }, _count: { _all: true } })
      : [];

    const out: Record<string, { n: number; liked: boolean; c: number }> = {};
    for (const id of ids) {
      const rows = new Set((sib.get(id) ?? []).map((r) => r.id));
      const users = new Set(likes.filter((l) => rows.has(l.postId)).map((l) => l.userId));
      const c = comments.filter((x) => rows.has(x.postId)).reduce((a, x) => a + x._count._all, 0);
      out[id] = { n: users.size, liked: users.has(user.id), c };
    }
    return NextResponse.json({ likes: out });
  } catch (error) {
    return serverError(error);
  }
}
