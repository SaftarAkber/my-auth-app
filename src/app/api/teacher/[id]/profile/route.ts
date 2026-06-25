import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ❗ DƏYİŞDİ: qeydiyyatsız/login olmayan istifadəçi də profili görə bilsin
    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch {
      // token yoxdur — normal hal, davam et
    }

    const { id: teacherId } = await params;

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId, role: "TEACHER" },
      select: {
        id: true, name: true, bio: true, photo: true, coverPhoto: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Müəllim tapılmadı" }, { status: 404 });
    }

    // ── Ümumi statistika (hər kəsə görünür) ──
    const [groupsCount, totalStudents, totalTests, totalVideos] = await Promise.all([
      prisma.group.count({ where: { teacherId, isActive: true } }),
      prisma.groupMember.count({ where: { group: { teacherId } } }),
      prisma.testPackage.count({
        where: {
          isPublished: true,
          OR: [
            { collection: { teacherId } },
            { group: { teacherId } },
            { testPackageGroups: { some: { group: { teacherId } } } },
          ],
        },
      }),
      prisma.video.count({
        where: { teacherId, isActive: true },
      }),
    ]);

    // All active groups (yalnız login olan tələbələr üçün detal, amma siyahı hər kəsə görünür)
    const groups = await prisma.group.findMany({
      where: { teacherId, isActive: true },
      include: {
        _count: { select: { members: true } },
        testPackages: {
          where: { isPublished: true },
          select: {
            id: true, name: true, isTimed: true, duration: true,
            isPublic: true,
            _count: { select: { questions: true } },
            testPackageGroups: { select: { groupId: true } },
          },
        },
        videoPackages: {
          where: { isPublished: true },
          select: {
            id: true, name: true, isPublic: true,
            _count: { select: { videos: true } },
            videoPackageGroups: { select: { groupId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Student membership info
    let myEnrollments: {
      id: string; status: string; groupId: string;
      group: { id: string; name: string };
    }[] = [];
    let memberGroupIds: string[] = [];

    if (currentUser && currentUser.role === "STUDENT") {
      myEnrollments = await prisma.enrollmentRequest.findMany({
        where: { studentId: currentUser.id, teacherId },
        select: {
          id: true, status: true, groupId: true,
          group: { select: { id: true, name: true } },
        },
      });

      const memberships = await prisma.groupMember.findMany({
        where: { studentId: currentUser.id, group: { teacherId } },
        select: { groupId: true },
      });
      memberGroupIds = memberships.map((m) => m.groupId);
    }

    // PUBLIC test packages (isPublic=true) — herkese görünsün
    const publicTestPackages = await prisma.testPackage.findMany({
      where: {
        isPublished: true,
        isPublic: true,
        OR: [
          { collection: { teacherId } },
          { group: { teacherId } },
          { testPackageGroups: { some: { group: { teacherId } } } },
        ],
      },
      select: {
        id: true, name: true, isTimed: true, duration: true,
        _count: { select: { questions: true } },
        testPackageGroups: { include: { group: { select: { id: true, name: true } } } },
      },
    });

    // PUBLIC video packages (isPublic=true)
    const publicVideoPackages = await prisma.videoPackage.findMany({
      where: {
        isPublished: true,
        isPublic: true,
        OR: [
          { collection: { teacherId } },
          { group: { teacherId } },
          { videoPackageGroups: { some: { group: { teacherId } } } },
        ],
      },
      select: {
        id: true, name: true,
        _count: { select: { videos: true } },
        videoPackageGroups: { include: { group: { select: { id: true, name: true } } } },
      },
    });

    // ❗ YENİ: Herkese açıq paylaşımlar (PUBLIC visibility) — hər kəsə görünür
    const publicPosts = await prisma.groupPost.findMany({
      where: {
        visibility: "PUBLIC",
        group: { teacherId },
      },
      include: {
        images: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      teacher,
      stats: {
        groups: groupsCount,
        students: totalStudents,
        tests: totalTests,
        videos: totalVideos,
      },
      groups,
      myEnrollments,
      memberGroupIds,
      publicTestPackages,
      publicVideoPackages,
      publicPosts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}