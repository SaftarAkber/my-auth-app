import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    if (currentUser.role === "TEACHER") {
      const groups = await prisma.group.findMany({
        where: { teacherId: currentUser.id },
        include: {
          _count: { select: { members: true, posts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ groups });
    } else {
      // Student — öğretmenin gruplarını getir
      const teacher = await prisma.user.findFirst({ where: { role: "TEACHER" } });
      if (!teacher) return NextResponse.json({ groups: [] });

      const groups = await prisma.group.findMany({
        where: { teacherId: teacher.id, isActive: true },
        include: {
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ groups });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, description, schedule, photo, coverPhoto } = await req.json();
    if (!name) return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        schedule: schedule || null,
        photo: photo || null,
        coverPhoto: coverPhoto || null,
        teacherId: currentUser.id,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}