import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TEACHER_LIMIT = 3;

export async function GET() {
  try {
    const teacherCount = await prisma.user.count({
      where: { role: "TEACHER" },
    });
    return NextResponse.json({ available: teacherCount < TEACHER_LIMIT });
  } catch (error) {
    console.error("teacher-available hatası:", error);
    return NextResponse.json({ available: false, error: "Sunucu hatası" }, { status: 500 });
  }
}