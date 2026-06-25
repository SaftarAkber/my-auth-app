import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch {
      // token yoxdur — normal hal
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, photo: true, bio: true },
        },
        members: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                photo: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Qrup tapılmadı" }, { status: 404 });
    }

    const isMember = currentUser
      ? group.members.some((m) => m.studentId === currentUser!.id)
      : false;
    const isTeacher = currentUser?.id === group.teacherId;
    const hasAccess = isMember || isTeacher;

    // Postlar
    const posts = await prisma.groupPost.findMany({
      where: {
        groupId: id,
        ...(hasAccess ? {} : { visibility: "PUBLIC" }),
      },
      include: {
        teacher: { select: { id: true, name: true, photo: true } },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Video paketlər — həm groupId ilə həm videoPackageGroups ilə bağlı olanlar
    const videoPackages = await prisma.videoPackage.findMany({
      where: {
        isPublished: true,
        OR: [
          { groupId: id },
          { videoPackageGroups: { some: { groupId: id } } },
        ],
        ...(hasAccess ? {} : { visibility: "PUBLIC" }),
      },
      include: {
        videos: { where: { isActive: true }, orderBy: { order: "asc" } },
        videoPackageGroups: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
    });

    // Test paketlər — həm groupId ilə həm testPackageGroups ilə bağlı olanlar
    const testPackages = await prisma.testPackage.findMany({
      where: {
        isPublished: true,
        OR: [
          { groupId: id },
          { testPackageGroups: { some: { groupId: id } } },
        ],
        ...(hasAccess ? {} : { visibility: "PUBLIC" }),
      },
      include: {
        questions: { where: { isActive: true }, select: { id: true } },
        testPackageGroups: {
          include: { group: { select: { id: true, name: true } } },
        },
        ...(currentUser
          ? {
              attempts: {
                where: { studentId: currentUser.id },
                select: {
                  id: true,
                  score: true,
                  totalScore: true,
                  finishedAt: true,
                  startedAt: true,
                },
              },
            }
          : {}),
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrollment statusu
    let enrollmentStatus = null;
    if (currentUser && !isTeacher) {
      const enrollment = await prisma.enrollmentRequest.findUnique({
        where: {
          studentId_groupId: { studentId: currentUser.id, groupId: id },
        },
      });
      enrollmentStatus = enrollment?.status ?? null;
    }

    // Enrollment müraciətləri — yalnız müəllimə
    const enrollmentReqs = isTeacher
      ? await prisma.enrollmentRequest.findMany({
          where: { groupId: id },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                photo: true,
                email: true,
                phone: true,
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      ...group,
      posts,
      videoPackages,
      testPackages,
      enrollmentReqs,
      isMember,
      isTeacher,
      hasAccess,
      enrollmentStatus,
    });
  } catch (error) {
    console.error("groups/[id] GET error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.teacherId !== currentUser.id) {
      return NextResponse.json({ error: "Qrup tapılmadı" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, schedule, photo, coverPhoto, isActive } = body;

    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(schedule !== undefined && { schedule }),
        ...(photo !== undefined && { photo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("groups/[id] PATCH error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group || group.teacherId !== currentUser.id) {
      return NextResponse.json({ error: "Qrup tapılmadı" }, { status: 404 });
    }

    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("groups/[id] DELETE error:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}