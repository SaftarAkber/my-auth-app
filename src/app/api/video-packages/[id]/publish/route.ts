import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroups, teacherOwnsVideoPackage } from "@/lib/guards";
import { applyVideoState, isVideoState } from "@/lib/videoState";

type Ctx = { params: Promise<{ id: string }> };

// Qısayol: paketdəki bütün videoları birdən eyni vəziyyətə keçirir (qaralama / hamıya açıq / seçilmiş qruplar)
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    if (!(await teacherOwnsVideoPackage(auth.user.id, id))) return forbidden();

    const { state, groupIds } = await req.json();
    if (!isVideoState(state)) return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
    const gids: string[] = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : [];
    if (state === "groups") {
      if (gids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
      if (!(await teacherOwnsGroups(auth.user.id, gids))) return forbidden();
    }

    const videos = await prisma.video.findMany({
      where: { packageId: id, teacherId: auth.user.id, isActive: true },
      select: { id: true },
    });
    await prisma.$transaction((tx) => applyVideoState(tx, videos.map((v) => v.id), state, gids));
    return NextResponse.json({ updated: videos.length });
  } catch (error) {
    return serverError(error);
  }
}
