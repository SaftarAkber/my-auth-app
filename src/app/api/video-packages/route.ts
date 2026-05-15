import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const packages = await prisma.videoPackage.findMany({
      where: {
        OR: [
          { collection: { teacherId: currentUser.id } },
          { group: { teacherId: currentUser.id } },
          { collectionId: null, groupId: null },
        ],
      },
      include: {
        videos: {
          where: { isActive: true, teacherId: currentUser.id },
          include: {
            videoGroups: {
              include: {
                group: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        videoPackageGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
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

    const { name, description, visibility, groupIds } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });
    }

    const pkg = await prisma.videoPackage.create({
      data: {
        name,
        description: description || null,
        visibility: visibility || "PUBLIC",
        videoPackageGroups: visibility === "GROUP_ONLY" && groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({ groupId })),
            }
          : undefined,
      },
      include: {
        videoPackageGroups: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}