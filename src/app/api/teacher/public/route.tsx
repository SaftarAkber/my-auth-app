import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        bio: true,
        photo: true,
        coverPhoto: true,
        _count: {
          select: { groups: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Backwards compat: student/page.tsx uses `teacherData.teacher` (single),
    // new pages use the full array. Return both.
    return NextResponse.json({
      teachers,
      teacher: teachers[0] ?? null, // legacy single-teacher support
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}