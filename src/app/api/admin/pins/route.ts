import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";

const SELECT = {
  id: true, title: true, url: true, pinOrder: true,
  teacher: { select: { id: true, name: true } },
} as const;

// Sancılmış videolar (maks. 3) + axtarış: GET /api/admin/pins?q=…
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
    const pinned = await prisma.video.findMany({ where: { pinOrder: { not: null } }, orderBy: { pinOrder: "asc" }, select: SELECT });
    const results = q.length >= 2
      ? await prisma.video.findMany({
          where: {
            isActive: true,
            isPublished: true,
            OR: [{ title: { contains: q, mode: "insensitive" } }, { teacher: { name: { contains: q, mode: "insensitive" } } }],
          },
          orderBy: { createdAt: "desc" },
          select: SELECT,
          take: 12,
        })
      : [];
    return NextResponse.json({ pinned, results });
  } catch (error) {
    return serverError(error);
  }
}

// Sancaqları təyin edir: PUT { videoIds: [id1, id2, id3] } — sıra əhəmiyyətlidir, 0-3 video
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const { videoIds } = await req.json();
    const ids: string[] = Array.isArray(videoIds) ? [...new Set<string>(videoIds.filter((x: unknown) => typeof x === "string"))] : [];
    if (ids.length > 3) return NextResponse.json({ error: "Ən çoxu 3 video sancıla bilər" }, { status: 400 });

    const found = await prisma.video.findMany({ where: { id: { in: ids }, isActive: true, isPublished: true }, select: { id: true } });
    if (found.length !== ids.length) return NextResponse.json({ error: "Dərc olunmuş video tapılmadı" }, { status: 400 });

    await prisma.$transaction([
      prisma.video.updateMany({ where: { pinOrder: { not: null } }, data: { pinOrder: null } }),
      ...ids.map((id, i) => prisma.video.update({ where: { id }, data: { pinOrder: i + 1 } })),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
