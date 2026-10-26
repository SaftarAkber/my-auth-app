import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notFound, serverError, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

// Hər kəsin profili (Instagram/LinkedIn məntiqi): məzmun yalnız izinə görə açılır
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const { id } = await params;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, bio: true, photo: true, coverPhoto: true, createdAt: true },
    });
    if (!target) return notFound("Profil tapılmadı");
    // Admin hesabı yalnız adminlərə görünür
    if (target.role === "ADMIN" && me.role !== "ADMIN") return notFound("Profil tapılmadı");

    const isOwn = me.id === target.id;
    const isAdmin = me.role === "ADMIN";

    // Baxanın üzv olduğu qruplar (qrupa özəl paylaşımları görmək üçün)
    const myGroupIds =
      me.role === "STUDENT"
        ? (await prisma.groupMember.findMany({ where: { studentId: me.id }, select: { groupId: true } })).map((m) => m.groupId)
        : [];

    if (target.role === "STUDENT") {
      const [groups, attempts] = await Promise.all([
        prisma.groupMember.findMany({
          where: { studentId: target.id },
          select: { group: { select: { id: true, name: true, description: true, schedule: true, teacherId: true, teacher: { select: { name: true } } } } },
        }),
        prisma.studentAttempt.count({ where: { studentId: target.id, finishedAt: { not: null } } }),
      ]);
      return NextResponse.json({
        user: target,
        isOwn,
        stats: { groups: groups.length, attempts },
        groups: groups.map((g) => g.group),
        posts: [], hiddenPosts: 0, tests: [], videos: [],
      });
    }

    if (target.role === "ADMIN") {
      return NextResponse.json({ user: target, isOwn, stats: {}, groups: [], posts: [], hiddenPosts: 0, tests: [], videos: [] });
    }

    // ── Müəllim ──
    const isOwner = isOwn;
    const full = isOwner || isAdmin;

    const groupsRaw = await prisma.group.findMany({
      where: { teacherId: target.id, ...(full ? {} : { isActive: true }) },
      select: {
        id: true, name: true, description: true, schedule: true, isActive: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let requestState: Record<string, string> = {};
    if (me.role === "STUDENT") {
      const reqs = await prisma.enrollmentRequest.findMany({
        where: { studentId: me.id, teacherId: target.id },
        select: { groupId: true, status: true },
      });
      requestState = Object.fromEntries(reqs.map((r) => [r.groupId, r.status]));
    }
    const groups = groupsRaw.map((g) => ({
      ...g,
      members: g._count.members,
      state: full ? "owner" : myGroupIds.includes(g.id) ? "member" : requestState[g.id] === "PENDING" ? "pending" : "none",
    }));

    const allPosts = await prisma.groupPost.findMany({
      where: { teacherId: target.id },
      include: { images: true, group: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    const visible = allPosts.filter(
      (p) => full || p.visibility === "PUBLIC" || myGroupIds.includes(p.groupId),
    );

    const testWhere = {
      OR: [
        { collection: { teacherId: target.id } },
        { group: { teacherId: target.id } },
        { testPackageGroups: { some: { group: { teacherId: target.id } } } },
      ],
    };
    const tests = await prisma.testPackage.findMany({
      where: full ? { ...testWhere } : { ...testWhere, isPublished: true, isPublic: true },
      select: {
        id: true, name: true, description: true, isPublished: true, isPublic: true, isTimed: true, duration: true,
        rewardEnabled: true, rewardMinCorrect: true, rewardCoins: true,
        _count: { select: { questions: true } },
        testPackageGroups: { select: { groupId: true } },
        groupId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const videoWhere = {
      OR: [
        { teacherId: target.id },
        { collection: { teacherId: target.id } },
        { group: { teacherId: target.id } },
        { videoPackageGroups: { some: { group: { teacherId: target.id } } } },
      ],
    };
    const packs = await prisma.videoPackage.findMany({
      where: full ? { ...videoWhere } : { ...videoWhere, isPublished: true, isPublic: true },
      select: {
        id: true, name: true, description: true, isPublished: true, isPublic: true,
        videos: { where: { isActive: true }, select: { id: true, title: true, url: true }, orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const studentCount = await prisma.groupMember.count({ where: { group: { teacherId: target.id } } });

    return NextResponse.json({
      user: target,
      isOwn,
      stats: { students: studentCount, groups: groups.length, posts: visible.length },
      groups,
      posts: visible,
      hiddenPosts: allPosts.length - visible.length,
      tests: tests.map((t) => ({
        ...t,
        member: myGroupIds.some((g) => t.groupId === g || t.testPackageGroups.some((x) => x.groupId === g)),
      })),
      videos: packs,
    });
  } catch (error) {
    return serverError(error);
  }
}
