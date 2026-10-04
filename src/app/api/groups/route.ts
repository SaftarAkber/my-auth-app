import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireTeacher, serverError, unauthorized } from "@/lib/guards";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    if (currentUser.role === "TEACHER") {
      const groups = await prisma.group.findMany({
        where: { teacherId: currentUser.id },
        include: { _count: { select: { members: true, posts: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ groups });
    }

    // Tələbə: bütün aktiv qruplar (müəllim məlumatı ilə)
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { members: true } },
        teacher: { select: { id: true, name: true, photo: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ groups });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { name, description, schedule, photo, coverPhoto } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: String(name).trim(),
        description: description || null,
        schedule: schedule || null,
        photo: photo || null,
        coverPhoto: coverPhoto || null,
        teacherId: auth.user.id,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
