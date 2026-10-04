import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsVideoPackage } from "@/lib/guards";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: packageId } = await params;
    if (!(await teacherOwnsVideoPackage(auth.user.id, packageId))) return forbidden();

    const { title, description, url, publicId, order } = await req.json();
    if (!title || !url) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    let nextOrder = order;
    if (nextOrder === undefined || nextOrder === null) {
      const last = await prisma.video.aggregate({ where: { packageId }, _max: { order: true } });
      nextOrder = (last._max.order ?? -1) + 1;
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        url,
        publicId: publicId || null,
        order: nextOrder,
        teacherId: auth.user.id,
        packageId,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
