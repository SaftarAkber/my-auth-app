import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";
import { HERO_SELECT } from "@/lib/hero";

/** GET /api/hero — ana səhifə karuselinin hazırda görünən slaydları */
export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const now = new Date();
    const slides = await prisma.heroSlide.findMany({
      where: {
        isActive: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: HERO_SELECT,
      take: 12,
    });
    return NextResponse.json({ slides });
  } catch (error) {
    return serverError(error);
  }
}
