import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { enrollmentId, action, teacherReply } = await req.json(); // requestId → enrollmentId

    if (!enrollmentId || !action) {
      return NextResponse.json({ error: "Bütün sahələr məcburidir" }, { status: 400 });
    }

    const request = await prisma.enrollmentRequest.findUnique({
      where: { id: enrollmentId }, // requestId → enrollmentId
    });

    if (!request || request.teacherId !== currentUser.id) {
      return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });
    }

    const updated = await prisma.enrollmentRequest.update({
      where: { id: enrollmentId }, // requestId → enrollmentId
      data: {
        status: action,
        teacherReply: teacherReply || null,
      },
    });

    if (action === "ACCEPTED") {
      await prisma.groupMember.upsert({
        where: {
          groupId_studentId: {
            groupId: request.groupId,
            studentId: request.studentId,
          },
        },
        create: {
          groupId: request.groupId,
          studentId: request.studentId,
        },
        update: {},
      });
    }

    if (action === "DECLINED") {
      await prisma.groupMember.deleteMany({
        where: {
          groupId: request.groupId,
          studentId: request.studentId,
        },
      });
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}