import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent, serverError } from "@/lib/guards";
import { studentGroupIds, testLiteSelect, visibleTestWhere } from "@/lib/topics";

/**
 * Tələbəyə açıq sual bankları (mövzu testləri): qruplarına açılmış və ya hərkəsə açıq.
 * Hərkəsə açıq banklar yalnız tələbənin qoşulduğu müəllimlərdən göstərilir.
 */
export async function GET() {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;
    const gids = await studentGroupIds(auth.user.id);
    if (gids.length === 0) return NextResponse.json({ tests: [] });
    const teachers = (await prisma.group.findMany({ where: { id: { in: gids } }, select: { teacherId: true } })).map((g) => g.teacherId);

    const tests = await prisma.testPackage.findMany({
      where: {
        AND: [
          { isBank: true },
          visibleTestWhere(gids),
          { OR: [{ collection: { teacherId: { in: teachers } } }, { group: { teacherId: { in: teachers } } }, { testPackageGroups: { some: { groupId: { in: gids } } } }] },
        ],
      },
      select: {
        ...testLiteSelect(auth.user.id),
        topicTests: { where: { topic: { isPublished: true } }, select: { topic: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ tests });
  } catch (error) {
    return serverError(error);
  }
}
