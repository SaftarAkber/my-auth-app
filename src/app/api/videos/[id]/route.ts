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
import { applyVideoState, isVideoState } from "@/lib/videoState";
import { destroyVideo } from "@/lib/videoUpload";

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

    const { title, description, url, state, groupIds, packageId, isActive, order } = await req.json();

    const gids: string[] = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : [];
    if (state !== undefined && !isVideoState(state)) return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
    if (state === "groups") {
      if (gids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
      if (!(await teacherOwnsGroups(auth.user.id, gids))) return forbidden();
    }
    if (packageId && !(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    const video = await prisma.$transaction(async (tx) => {
      if (state) await applyVideoState(tx, [id], state, gids);
      return tx.video.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(url && { url }),
          ...(packageId !== undefined && { packageId: packageId || null }),
          ...(isActive !== undefined && { isActive }),
          ...(order !== undefined && { order }),
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
    const v = await prisma.video.findFirst({ where: { id, teacherId: auth.user.id }, select: { publicId: true } });
    if (!v) return notFound();
    await prisma.video.delete({ where: { id } });
    await destroyVideo(v.publicId);
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
