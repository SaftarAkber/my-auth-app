import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canWatchVideo, stateOf } from "@/lib/videoAccess";

type Ctx = { params: Promise<{ id: string }> };

// Baxış səhifəsi üçün video məlumatı (yalnız giriş etmiş istifadəçilər)
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const access = await canWatchVideo(user, id);
    if (!access.exists) return notFound("Video tapılmadı");
    if (!access.allowed) return forbidden();

    const v = await prisma.video.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, photo: true, subjects: true } },
        package: { select: { id: true, name: true } },
        _count: { select: { views: true, likes: true } },
        likes: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!v) return notFound("Video tapılmadı");

    return NextResponse.json({
      video: {
        id: v.id,
        title: v.title,
        description: v.description,
        url: v.url,
        createdAt: v.createdAt,
        teacher: v.teacher,
        package: v.package,
        state: stateOf(v),
        pinned: v.pinOrder !== null,
        views: v._count.views,
        likes: v._count.likes,
        liked: v.likes.length > 0,
        isOwner: access.owner,
        groupAccess: access.groupAccess,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
