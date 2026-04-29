import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "STUDENT") {
      return NextResponse.json({ error: "Yalnız tələbələr müraciət edə bilər" }, { status: 403 });
    }

    const { groupId, message } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "Qrup seçilməlidir" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { teacherId: true, isActive: true },
    });

    if (!group || !group.isActive) {
      return NextResponse.json({ error: "Qrup tapılmadı" }, { status: 404 });
    }

    // ✅ YENİ: Zaten grup üyesi mi?
    const alreadyMember = await prisma.groupMember.findUnique({
      where: {
        groupId_studentId: { groupId, studentId: currentUser.id },
      },
    });

    if (alreadyMember) {
      return NextResponse.json(
        { error: "Artıq bu qrupun üzvüsünüz" },
        { status: 409 }
      );
    }

    // Daha önce istek göndermiş mi?
    const existing = await prisma.enrollmentRequest.findUnique({
      where: { studentId_groupId: { studentId: currentUser.id, groupId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu qrupa artıq müraciət göndərdiniz" },
        { status: 409 }
      );
    }

    const request = await prisma.enrollmentRequest.create({
      data: {
        studentId: currentUser.id,
        teacherId: group.teacherId,
        groupId,
        message: message || null,
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}