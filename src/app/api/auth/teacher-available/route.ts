import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TEACHER_LIMIT } from "@/lib/config";

export async function GET() {
  try {
    const teacherCount = await prisma.user.count({ where: { role: "TEACHER" } });
    return NextResponse.json({ available: teacherCount < TEACHER_LIMIT });
  } catch (error) {
    console.error("teacher-available xətası:", error);
    return NextResponse.json({ available: false, error: "Server xətası" }, { status: 500 });
  }
}
