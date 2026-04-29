import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teacherCount = await prisma.user.count({
    where: { role: "TEACHER" },
  });
  return NextResponse.json({ available: teacherCount === 0 });
}