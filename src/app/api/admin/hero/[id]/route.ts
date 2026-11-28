import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireAdmin, serverError } from "@/lib/guards";
import { cleanHero, HERO_SELECT } from "@/lib/hero";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — slaydı yenilə (tam forma və ya yalnız { isActive }) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!(await prisma.heroSlide.findUnique({ where: { id }, select: { id: true } }))) return notFound("Slayd tapılmadı");
    if (Object.keys(body).length === 1 && typeof body.isActive === "boolean") {
      const slide = await prisma.heroSlide.update({ where: { id }, data: { isActive: body.isActive }, select: HERO_SELECT });
      return NextResponse.json({ slide });
    }
    const c = cleanHero(body);
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const slide = await prisma.heroSlide.update({ where: { id }, data: c.data, select: HERO_SELECT });
    return NextResponse.json({ slide });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    await prisma.heroSlide.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
