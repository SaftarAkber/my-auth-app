import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  requireTeacher,
  serverError,
  teacherOwnsGroups,
  teacherOwnsVideoPackage,
} from "@/lib/guards";

export async function GET() {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const videos = await prisma.video.findMany({
      where: { teacherId: auth.user.id },
      include: {
        package: { select: { id: true, name: true } },
        videoGroups: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { title, description, url, visibility, groupIds, packageId } = await req.json();
    if (!title || !url) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    const ids: string[] = Array.isArray(groupIds) ? groupIds : [];
    if (!(await teacherOwnsGroups(auth.user.id, ids))) return forbidden();
    if (packageId && !(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        url,
        visibility: visibility || "PUBLIC",
        teacherId: auth.user.id,
        packageId: packageId || null,
        videoGroups:
          visibility === "GROUP_ONLY" && ids.length
            ? { create: ids.map((groupId) => ({ groupId })) }
            : undefined,
      },
      include: { videoGroups: { include: { group: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
