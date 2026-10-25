import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, serverError } from "@/lib/guards";

// Tələbənin üzv olduğu qrupların dərc olunmuş video paketləri
export async function GET() {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;

    const memberships = await prisma.groupMember.findMany({
      where: { studentId: auth.user.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) return NextResponse.json({ packages: [] });

    const packages = await prisma.videoPackage.findMany({
      where: {
        isPublished: true,
        OR: [{ groupId: { in: groupIds } }, { videoPackageGroups: { some: { groupId: { in: groupIds } } } }],
      },
      select: {
        id: true, name: true, description: true,
        teacher: { select: { id: true, name: true } },
        videoPackageGroups: { select: { group: { select: { id: true, name: true } } } },
        videos: {
          where: { isActive: true },
          select: { id: true, title: true, url: true, description: true, order: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    return serverError(error);
  }
}
