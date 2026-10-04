import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id: packageId } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, packageId))) return forbidden();

    const { text, type, options, correctAnswer, order } = await req.json();

    if (!text || !type) {
      return NextResponse.json({ error: "Sual mətni və tipi məcburidir" }, { status: 400 });
    }
    if (type === "MULTIPLE_CHOICE") {
      if (!Array.isArray(options) || options.filter(Boolean).length < 2) {
        return NextResponse.json({ error: "Ən azı 2 variant lazımdır" }, { status: 400 });
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        return NextResponse.json({ error: "Düzgün cavab variantlar arasından seçilməlidir" }, { status: 400 });
      }
    }

    // Sıra verilməyibsə sona əlavə et
    let nextOrder = order;
    if (nextOrder === undefined || nextOrder === null) {
      const last = await prisma.question.aggregate({ where: { packageId }, _max: { order: true } });
      nextOrder = (last._max.order ?? -1) + 1;
    }

    const question = await prisma.question.create({
      data: {
        text,
        type,
        options: type === "MULTIPLE_CHOICE" ? options : undefined,
        correctAnswer: type === "MULTIPLE_CHOICE" ? correctAnswer : null,
        order: nextOrder,
        packageId,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
