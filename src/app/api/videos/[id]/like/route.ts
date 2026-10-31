import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canWatchVideo } from "@/lib/videoAccess";

type Ctx = { params: Promise<{ id: string }> };

// Bəyənməni aç/bağla (hər istifadəçi bir dəfə)
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const access = await canWatchVideo(user, id);
    if (!access.exists) return notFound();
    if (!access.allowed) return forbidden();

    const existing = await prisma.videoLike.findUnique({ where: { videoId_userId: { videoId: id, userId: user.id } } });
    if (existing) await prisma.videoLike.delete({ where: { id: existing.id } });
    else await prisma.videoLike.create({ data: { videoId: id, userId: user.id } });

    const likes = await prisma.videoLike.count({ where: { videoId: id } });
    return NextResponse.json({ liked: !existing, likes });
  } catch (error) {
    return serverError(error);
  }
}
