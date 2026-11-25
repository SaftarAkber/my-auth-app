import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";
import { ownedTestWhere } from "@/lib/topics";

/** Mövzuya bağlamaq üçün müəllimin test paketləri və videoları */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const topic = await prisma.topic.findUnique({ where: { id }, select: { teacherId: true } });
    if (!topic) return notFound("Mövzu tapılmadı");
    if (topic.teacherId !== auth.user.id) return forbidden();

    const [tests, videos] = await Promise.all([
      prisma.testPackage.findMany({
        where: ownedTestWhere(auth.user.id),
        select: {
          id: true, name: true, isPublished: true, visibility: true,
          collection: { select: { name: true } },
          _count: { select: { questions: { where: { archivedAt: null } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.video.findMany({
        where: { teacherId: auth.user.id, isActive: true },
        select: { id: true, title: true, url: true, isPublished: true, visibility: true, package: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);
    return NextResponse.json({ tests, videos });
  } catch (error) {
    return serverError(error);
  }
}
