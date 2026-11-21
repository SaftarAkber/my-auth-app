import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canSeePost, siblingMap } from "@/lib/posts";

type Ctx = { params: Promise<{ id: string }> };

// Paylaşımı bəyənənlər (ən son bəyənən birinci)
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const rows = (await siblingMap([id])).get(id) ?? [];
    if (rows.length === 0) return notFound();
    if (!(await canSeePost(user, rows))) return forbidden();

    const likes = await prisma.postLike.findMany({
      where: { postId: { in: rows.map((r) => r.id) }, user: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: { user: { select: { id: true, name: true, photo: true } } },
    });
    const seen = new Set<string>();
    const users = likes.map((l) => l.user).filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
    return NextResponse.json({ users });
  } catch (error) {
    return serverError(error);
  }
}
