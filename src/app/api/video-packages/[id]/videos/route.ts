import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroups, teacherOwnsVideoPackage } from "@/lib/guards";
import { applyVideoState, isVideoState } from "@/lib/videoState";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: packageId } = await params;
    if (!(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    const { title, description, url, publicId, order, state, groupIds } = await req.json();
    if (!title || !url) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    let nextOrder = order;
    if (nextOrder === undefined || nextOrder === null) {
      const last = await prisma.video.aggregate({ where: { packageId }, _max: { order: true } });
      nextOrder = (last._max.order ?? -1) + 1;
    }

    const gids: string[] = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : [];
    if (state !== undefined && !isVideoState(state)) return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
    if (state === "groups") {
      if (gids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
      if (!(await teacherOwnsGroups(auth.user.id, gids))) return forbidden();
    }

    // Yeni video standart olaraq qaralamadır
    const video = await prisma.$transaction(async (tx) => {
      const created = await tx.video.create({
        data: { title, description: description || null, url, publicId: publicId || null, order: nextOrder, teacherId: auth.user.id, packageId },
      });
      if (state) await applyVideoState(tx, [created.id], state, gids);
      return created;
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
