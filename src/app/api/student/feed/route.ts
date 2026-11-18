import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, serverError } from "@/lib/guards";
import { collapsePosts } from "@/lib/posts";

const PAGE = 10;

/**
 * Tələbənin ana səhifə lenti: üzv olduğu qrupların müəllimlərinin paylaşımları.
 * Görünmə qaydası müəllim profilindəki kimidir: həmin müəllimin hərkəsə açıq paylaşımları + tələbənin öz qruplarındakı paylaşımlar.
 * Səhifələmə: ?before=<ISO tarix> (əvvəlki səhifənin sonuncu paylaşımının tarixi).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const memberships = await prisma.groupMember.findMany({
      where: { studentId: auth.user.id },
      select: { groupId: true, group: { select: { teacherId: true } } },
    });
    if (memberships.length === 0) return NextResponse.json({ posts: [], hasMore: false });
    const groupIds = memberships.map((m) => m.groupId);
    const teacherIds = [...new Set(memberships.map((m) => m.group.teacherId))];

    const beforeRaw = req.nextUrl.searchParams.get("before");
    const before = beforeRaw ? new Date(beforeRaw) : null;

    const rows = await prisma.groupPost.findMany({
      where: {
        teacherId: { in: teacherIds },
        OR: [{ groupId: { in: groupIds } }, { visibility: "PUBLIC" }],
        ...(before && !Number.isNaN(+before) ? { createdAt: { lt: before } } : {}),
      },
      include: {
        images: true,
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true, photo: true } },
      },
      orderBy: { createdAt: "desc" },
      // Bir neçə qrupa göndərilmiş paylaşımın nüsxələri bir karta yığılır, ona görə ehtiyatla çox götürürük
      take: PAGE * 6,
    });
    const posts = collapsePosts(rows);

    return NextResponse.json({ posts: posts.slice(0, PAGE), hasMore: posts.length > PAGE });
  } catch (error) {
    return serverError(error);
  }
}
