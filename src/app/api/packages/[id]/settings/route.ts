import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ownerTeacherId } from "@/lib/rewards";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

/** Paket ayarları pəncərəsi üçün: testin ayarları, sahib müəllimin qrupları və mövzuları, səviyyələr üzrə sual sayı */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const { id } = await params;

    // Yeni test: yalnız müəllimin qrupları və mövzuları
    if (id === "new") {
      if (me.role !== "TEACHER") return forbidden();
      const [groups, topics] = await Promise.all([
        prisma.group.findMany({ where: { teacherId: me.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
        prisma.topic.findMany({ where: { teacherId: me.id }, select: { id: true, title: true, isPublished: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
      ]);
      // Qruplarla məhdud kolleksiyada yalnız kolleksiyanın qrupları
      const colId = req.nextUrl.searchParams.get("collectionId");
      const col = colId
        ? await prisma.collection.findFirst({ where: { id: colId, teacherId: me.id }, select: { visibility: true, groups: { select: { groupId: true } } } })
        : null;
      const only = col?.visibility === "GROUP_ONLY" ? col.groups.map((g) => g.groupId) : null;
      return NextResponse.json({
        package: null,
        groups: only ? groups.filter((g) => only.includes(g.id)) : groups,
        restricted: !!only,
        topics,
        counts: { EASY: 0, MEDIUM: 0, HARD: 0, NONE: 0 },
      });
    }

    let ownerId: string | null = null;
    if (me.role === "ADMIN") ownerId = await ownerTeacherId(id);
    else if (me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, id))) ownerId = me.id;
    if (!ownerId) return forbidden();

    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      select: {
        id: true, name: true, description: true, isPublished: true, isPublic: true, visibility: true,
        isTimed: true, duration: true, startsAt: true, endsAt: true, allowRetry: true, shareAnswers: true,
        rewardEnabled: true, rewardMinCorrect: true, rewardCoins: true, rewardAuto: true,
        isBank: true, drawEasy: true, drawMedium: true, drawHard: true, isMonthly: true,
        collection: { select: { visibility: true, groups: { select: { groupId: true } } } },
        testPackageGroups: { select: { groupId: true } },
        topicTests: { select: { topicId: true } },
        _count: { select: { attempts: true } },
      },
    });
    if (!pkg) return notFound();

    const [groups, topics, byDiff] = await Promise.all([
      prisma.group.findMany({ where: { teacherId: ownerId }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
      prisma.topic.findMany({ where: { teacherId: ownerId }, select: { id: true, title: true, isPublished: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
      prisma.question.groupBy({ by: ["difficulty"], where: { packageId: id, isActive: true }, _count: { _all: true } }),
    ]);
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0, NONE: 0 };
    for (const r of byDiff) counts[r.difficulty ?? "NONE"] += r._count._all;

    const { collection, testPackageGroups, topicTests, ...rest } = pkg;
    const restricted = collection?.visibility === "GROUP_ONLY" ? collection.groups.map((g) => g.groupId) : null;
    return NextResponse.json({
      package: { ...rest, groupIds: testPackageGroups.map((g) => g.groupId), topicIds: topicTests.map((t) => t.topicId) },
      groups: restricted ? groups.filter((g) => restricted.includes(g.id)) : groups,
      restricted: !!restricted,
      topics,
      counts,
    });
  } catch (error) {
    return serverError(error);
  }
}
