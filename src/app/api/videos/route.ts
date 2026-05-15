import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: { teacherId: currentUser.id },
      include: {
        package: { select: { id: true, name: true } },
        videoGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
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

    const { title, description, url, visibility, groupIds, packageId } = await req.json();

    if (!title || !url) {
      return NextResponse.json({ error: "Başlıq və URL məcburidir" }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        url,
        visibility: visibility || "PUBLIC",
        teacherId: currentUser.id,
        packageId: packageId || null,
        videoGroups: visibility === "GROUP_ONLY" && groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({ groupId })),
            }
          : undefined,
      },
      include: {
        videoGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}