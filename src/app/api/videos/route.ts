import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  requireTeacher,
  serverError,
  teacherOwnsGroups,
  teacherOwnsVideoPackage,
} from "@/lib/guards";
import { applyVideoState, isVideoState } from "@/lib/videoState";
import { UploadRejected, verifyUploadedVideo } from "@/lib/videoUpload";

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

    const { title, description, url, uploadPublicId, state, groupIds, packageId } = await req.json();
    if (!title || (!url && !uploadPublicId)) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    const ids: string[] = Array.isArray(groupIds) ? groupIds.filter((g) => typeof g === "string") : [];
    if (state !== undefined && !isVideoState(state)) return NextResponse.json({ error: "Naməlum vəziyyət" }, { status: 400 });
    if (state === "groups" && ids.length === 0) return NextResponse.json({ error: "Ən azı bir qrup seçin" }, { status: 400 });
    if (!(await teacherOwnsGroups(auth.user.id, ids))) return forbidden();
    if (packageId && !(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    // Yüklənmiş fayl: yalnız Cloudinary-dən təsdiqlənmiş məlumat qəbul edilir (client-in göndərdiyi link/publicId yox)
    let media: { url: string; publicId: string | null; bytes: number | null; duration: number | null } = {
      url: String(url ?? ""), publicId: null, bytes: null, duration: null,
    };
    if (uploadPublicId) {
      if (await prisma.video.findFirst({ where: { publicId: String(uploadPublicId) }, select: { id: true } })) {
        return NextResponse.json({ error: "Bu yükləmə artıq əlavə olunub" }, { status: 409 });
      }
      try {
        media = await verifyUploadedVideo(auth.user.id, String(uploadPublicId));
      } catch (e) {
        if (e instanceof UploadRejected) return NextResponse.json({ error: e.message }, { status: e.status });
        throw e;
      }
    }

    // Yeni video standart olaraq qaralamadır; müəllim istəsə dərhal vəziyyət göndərə bilər
    const video = await prisma.$transaction(async (tx) => {
      const created = await tx.video.create({
        data: { title, description: description || null, ...media, teacherId: auth.user.id, packageId: packageId || null },
      });
      if (state) await applyVideoState(tx, [created.id], state, ids);
      return tx.video.findUniqueOrThrow({
        where: { id: created.id },
        include: { videoGroups: { include: { group: { select: { id: true, name: true } } } } },
      });
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
