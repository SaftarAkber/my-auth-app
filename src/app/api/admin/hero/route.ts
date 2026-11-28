import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";
import { cleanHero, HERO_SELECT } from "@/lib/hero";

/** GET — bütün slaydlar (admin); POST — yeni slayd (sonuna əlavə olunur) */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const slides = await prisma.heroSlide.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: HERO_SELECT });
    return NextResponse.json({ slides });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const c = cleanHero(await req.json().catch(() => ({})));
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const last = await prisma.heroSlide.aggregate({ _max: { order: true } });
    const slide = await prisma.heroSlide.create({ data: { ...c.data, order: (last._max.order ?? -1) + 1 }, select: HERO_SELECT });
    return NextResponse.json({ slide }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

/** PUT — sıra: { ids: [...] } */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { ids } = await req.json().catch(() => ({ ids: [] }));
    if (!Array.isArray(ids)) return NextResponse.json({ error: "Yanlış sorğu" }, { status: 400 });
    await prisma.$transaction(ids.filter((x): x is string => typeof x === "string").map((id, order) => prisma.heroSlide.update({ where: { id }, data: { order } })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
