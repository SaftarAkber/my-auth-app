import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canWatchVideo } from "@/lib/videoAccess";

type Ctx = { params: Promise<{ id: string }> };

// Baxışı qeyd edir: hər istifadəçidən hər video üçün yalnız bir dəfə sayılır (müəllimin öz baxışı sayılmır)
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const access = await canWatchVideo(user, id);
    if (!access.exists) return notFound();
    if (!access.allowed) return forbidden();

    if (!access.owner && user.role !== "ADMIN") {
      await prisma.videoView.createMany({ data: [{ videoId: id, userId: user.id }], skipDuplicates: true });
    }
    const views = await prisma.videoView.count({ where: { videoId: id } });
    return NextResponse.json({ views });
  } catch (error) {
    return serverError(error);
  }
}
