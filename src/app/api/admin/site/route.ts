import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, serverError } from "@/lib/guards";
import { getSiteContent, mergeSite, type SiteContent } from "@/lib/site";

const s = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

function pairs(v: unknown, max: number, fallback: { title: string; text: string }[]) {
  if (!Array.isArray(v)) return fallback;
  return v
    .slice(0, max)
    .map((x) => ({
      title: typeof x?.title === "string" ? x.title.trim().slice(0, 80) : "",
      text: typeof x?.text === "string" ? x.text.trim().slice(0, 300) : "",
    }))
    .filter((x) => x.title || x.text);
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    return NextResponse.json({ site: await getSiteContent() });
  } catch (error) {
    return serverError(error);
  }
}

// Giriş etməmiş ziyarətçilərin gördüyü ana səhifənin məzmunu
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const b = await req.json();
    const cur = await getSiteContent();
    const next: SiteContent = mergeSite({
      brand: s(b.brand, 40, cur.brand),
      heroTitle: s(b.heroTitle, 120, cur.heroTitle),
      heroText: s(b.heroText, 400, cur.heroText),
      heroBtn: s(b.heroBtn, 40, cur.heroBtn),
      features: pairs(b.features, 8, cur.features),
      stepsTitle: s(b.stepsTitle, 80, cur.stepsTitle),
      steps: pairs(b.steps, 6, cur.steps),
      closeTitle: s(b.closeTitle, 120, cur.closeTitle),
      closeText: s(b.closeText, 300, cur.closeText),
      footer: s(b.footer, 160, cur.footer),
      show: {
        features: b.show?.features !== false,
        steps: b.show?.steps !== false,
        close: b.show?.close !== false,
      },
    });

    await prisma.siteContent.upsert({
      where: { key: "landing" },
      create: { key: "landing", data: next as unknown as Prisma.InputJsonValue },
      update: { data: next as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ site: next });
  } catch (error) {
    return serverError(error);
  }
}
