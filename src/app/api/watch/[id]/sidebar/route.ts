import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { canWatchVideo, myGroupIds, publicVideoWhere, seededOrder, visibleVideoWhere } from "@/lib/videoAccess";

type Ctx = { params: Promise<{ id: string }> };

const PAGE = 10;
const CARD = {
  id: true, title: true, url: true, createdAt: true, packageId: true,
  teacher: { select: { id: true, name: true } },
  _count: { select: { views: true } },
} satisfies Prisma.VideoSelect;
type Row = Prisma.VideoGetPayload<{ select: typeof CARD }>;

const card = (v: Row) => ({
  id: v.id, title: v.title, url: v.url, createdAt: v.createdAt, teacher: v.teacher, views: v._count.views,
});

/**
 * Sağ siyahı (YouTube kimi). Sıra:
 *  1) adminin sancdığı videolar (maks. 3)   2) baxılan videonun paketi   3) üzv olduğum qrupların digər paketləri
 *  4) həmin müəllimin 1-3 təsadüfi videosu   5) eyni fənn üzrə digər müəllimlər   6) qlobal: yeni + çox izlənən
 * 4-6 "feed" kimi 10-10 səhifələnir; seed eyni qalır ki, siyahı "Daha çox"da dəyişməsin.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const url = new URL(req.url);
    const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
    const seed = (url.searchParams.get("seed") ?? id).slice(0, 40);

    const access = await canWatchVideo(user, id);
    if (!access.exists) return notFound("Video tapılmadı");
    if (!access.allowed) return forbidden();

    const cur = await prisma.video.findUnique({
      where: { id },
      select: { id: true, teacherId: true, packageId: true, package: { select: { id: true, name: true } }, teacher: { select: { subjects: true } } },
    });
    if (!cur) return notFound("Video tapılmadı");

    const gids = await myGroupIds(user);
    const vis = visibleVideoWhere(gids);
    const taken = new Set<string>([id]);

    // 1) sancılmışlar
    const pinnedRows = await prisma.video.findMany({
      where: { isActive: true, isPublished: true, pinOrder: { not: null }, id: { not: id } },
      orderBy: { pinOrder: "asc" },
      select: CARD,
      take: 3,
    });
    pinnedRows.forEach((v) => taken.add(v.id));

    // 2) baxılan videonun paketi (o daxil, baxılan video seçilmiş görünür)
    let currentPackage: { id: string; name: string; videos: ReturnType<typeof card>[] } | null = null;
    if (cur.packageId && cur.package) {
      const rows = await prisma.video.findMany({
        where: { packageId: cur.packageId, OR: [{ id }, vis] },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: CARD,
        take: 60,
      });
      currentPackage = { id: cur.package.id, name: cur.package.name, videos: rows.map(card) };
      rows.forEach((v) => taken.add(v.id));
    }

    // 3) üzv olduğum qrupların digər video paketləri
    let groupPackages: { id: string; name: string; videos: ReturnType<typeof card>[] }[] = [];
    if (gids.length) {
      const pkgs = await prisma.videoPackage.findMany({
        where: {
          ...(cur.packageId ? { id: { not: cur.packageId } } : {}),
          videos: { some: { AND: [vis, { videoGroups: { some: { groupId: { in: gids } } } }] } },
        },
        select: {
          id: true, name: true,
          videos: { where: vis, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: CARD, take: 30 },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
      groupPackages = pkgs.map((p) => ({ id: p.id, name: p.name, videos: p.videos.map(card) }));
      pkgs.forEach((p) => p.videos.forEach((v) => taken.add(v.id)));
    }

    // 4-6) feed
    const notTaken = { id: { notIn: [...taken] } };
    const mine = seededOrder(
      await prisma.video.findMany({
        where: { AND: [vis, notTaken, { teacherId: cur.teacherId }] },
        orderBy: { createdAt: "desc" },
        select: CARD,
        take: 40,
      }),
      seed,
    ).slice(0, 3);

    const subjects = cur.teacher.subjects;
    const topic = subjects.length
      ? seededOrder(
          await prisma.video.findMany({
            where: { AND: [publicVideoWhere, notTaken, { teacherId: { not: cur.teacherId }, teacher: { subjects: { hasSome: subjects } } }] },
            orderBy: { createdAt: "desc" },
            select: CARD,
            take: 60,
          }),
          seed,
        )
      : [];

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const hot = await prisma.videoView.groupBy({
      by: ["videoId"],
      where: { createdAt: { gte: since } },
      _count: { videoId: true },
      orderBy: { _count: { videoId: "desc" } },
      take: 40,
    });
    const popular = hot.length
      ? await prisma.video.findMany({ where: { AND: [publicVideoWhere, notTaken, { id: { in: hot.map((h) => h.videoId) } }] }, select: CARD })
      : [];
    const order = new Map(hot.map((h, i) => [h.videoId, i]));
    popular.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    const newest = await prisma.video.findMany({ where: { AND: [publicVideoWhere, notTaken] }, orderBy: { createdAt: "desc" }, select: CARD, take: 60 });
    const mixed: Row[] = [];
    for (let i = 0; i < Math.max(popular.length, newest.length); i++) {
      if (popular[i]) mixed.push(popular[i]);
      if (newest[i]) mixed.push(newest[i]);
    }
    const global = seededOrder(mixed, seed);

    const seen = new Set<string>();
    const feed = [...mine, ...topic, ...global].filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
    const slice = feed.slice(page * PAGE, (page + 1) * PAGE).map(card);

    return NextResponse.json({
      pinned: page === 0 ? pinnedRows.map(card) : [],
      currentPackage: page === 0 ? currentPackage : null,
      groupPackages: page === 0 ? groupPackages : [],
      feed: slice,
      hasMore: feed.length > (page + 1) * PAGE,
    });
  } catch (error) {
    return serverError(error);
  }
}
