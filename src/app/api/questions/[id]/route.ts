import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const auth = await requireTeacher();
  if ("response" in auth) return { response: auth.response };

  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true, packageId: true },
  });
  if (!question) return { response: notFound() };
  if (!(await teacherOwnsTestPackage(auth.user.id, question.packageId))) {
    return { response: forbidden() };
  }
  return { question };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await authorize(id);
    if ("response" in result) return result.response;

    const { text, type, options, correctAnswer, isActive, order } = await req.json();

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && { options }),
        ...(correctAnswer !== undefined && { correctAnswer }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const result = await authorize(id);
    if ("response" in result) return result.response;

    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
