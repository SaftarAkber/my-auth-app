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
      ? await prisma.postLike.findMany({ where: { postId: { in: allIds } }, select: { postId: true, userId: true } })
      : [];

    const out: Record<string, { n: number; liked: boolean }> = {};
    for (const id of ids) {
      const rows = new Set((sib.get(id) ?? []).map((r) => r.id));
      const users = new Set(likes.filter((l) => rows.has(l.postId)).map((l) => l.userId));
      out[id] = { n: users.size, liked: users.has(user.id) };
    }
    return NextResponse.json({ likes: out });
  } catch (error) {
    return serverError(error);
  }
}
