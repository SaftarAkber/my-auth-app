import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroups } from "@/lib/guards";

export async function GET() {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const teacherId = auth.user.id;

    const packages = await prisma.videoPackage.findMany({
      where: {
        OR: [
          { teacherId },
          { collection: { teacherId } },
          { group: { teacherId } },
          { videoPackageGroups: { some: { group: { teacherId } } } },
        ],
      },
      include: {
        videos: {
          where: { isActive: true, teacherId },
          include: { videoGroups: { include: { group: { select: { id: true, name: true } } } } },
          orderBy: { order: "asc" },
        },
        videoPackageGroups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { name, description, visibility, groupIds, isPublic } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });
    }

    const ids: string[] = Array.isArray(groupIds) ? groupIds : [];
    if (!(await teacherOwnsGroups(auth.user.id, ids))) return forbidden();

    const groupOnly = visibility === "GROUP_ONLY" && ids.length > 0;

    const pkg = await prisma.videoPackage.create({
      data: {
        name,
        description: description || null,
        visibility: groupOnly ? "GROUP_ONLY" : "PUBLIC",
        isPublic: !!isPublic,
        teacherId: auth.user.id,
        videoPackageGroups: ids.length
          ? { create: ids.map((groupId) => ({ groupId })) }
          : undefined,
      },
      include: { videoPackageGroups: { include: { group: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
