import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  notFound,
  requireTeacher,
  serverError,
  teacherOwnsGroups,
  teacherOwnsVideoPackage,
} from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const owned = await prisma.video.findFirst({
      where: { id, teacherId: auth.user.id },
      select: { id: true },
    });
    if (!owned) return notFound();

    const { title, description, url, visibility, groupIds, packageId, isActive, order } = await req.json();

    if (Array.isArray(groupIds) && !(await teacherOwnsGroups(auth.user.id, groupIds))) {
      return forbidden();
    }
    if (packageId && !(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    const video = await prisma.$transaction(async (tx) => {
      // Qrup bağlantıları yalnız siyahı və ya görünürlük dəyişdikdə yenilənir
      if (Array.isArray(groupIds) || visibility === "PUBLIC") {
        await tx.videoGroup.deleteMany({ where: { videoId: id } });
      }
      return tx.video.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(url && { url }),
          ...(visibility && { visibility }),
          ...(packageId !== undefined && { packageId: packageId || null }),
          ...(isActive !== undefined && { isActive }),
          ...(order !== undefined && { order }),
          ...(visibility !== "PUBLIC" && Array.isArray(groupIds) && groupIds.length
            ? { videoGroups: { create: groupIds.map((groupId: string) => ({ groupId })) } }
            : {}),
        },
        include: { videoGroups: { include: { group: { select: { id: true, name: true } } } } },
      });
    });

    return NextResponse.json({ video });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const result = await prisma.video.deleteMany({ where: { id, teacherId: auth.user.id } });
    if (result.count === 0) return notFound();
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
