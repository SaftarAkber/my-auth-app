import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireTeacher, serverError } from "@/lib/guards";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { enrollmentId, action, teacherReply } = await req.json();

    if (!enrollmentId || !action) {
      return NextResponse.json({ error: "Bütün sahələr məcburidir" }, { status: 400 });
    }
    if (action !== "ACCEPTED" && action !== "DECLINED") {
      return NextResponse.json({ error: "Yanlış əməliyyat" }, { status: 400 });
    }

    const request = await prisma.enrollmentRequest.findUnique({ where: { id: enrollmentId } });
    if (!request || request.teacherId !== auth.user.id) return notFound();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.enrollmentRequest.update({
        where: { id: enrollmentId },
        data: { status: action, teacherReply: teacherReply || null },
      });

      if (action === "ACCEPTED") {
        await tx.groupMember.upsert({
          where: { groupId_studentId: { groupId: request.groupId, studentId: request.studentId } },
          create: { groupId: request.groupId, studentId: request.studentId },
          update: {},
        });
      } else {
        await tx.groupMember.deleteMany({
          where: { groupId: request.groupId, studentId: request.studentId },
        });
      }
      return result;
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return serverError(error);
  }
}
