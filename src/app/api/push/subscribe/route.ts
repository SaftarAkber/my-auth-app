import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optionalUser, serverError, unauthorized } from "@/lib/guards";

// Telefon bildirişləri: bu cihazın abunəliyini yadda saxla (POST) və ya sil (DELETE)
export async function POST(req: NextRequest) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const b = await req.json();
    const endpoint = typeof b?.endpoint === "string" ? b.endpoint : "";
    const p256dh = typeof b?.keys?.p256dh === "string" ? b.keys.p256dh : "";
    const auth = typeof b?.keys?.auth === "string" ? b.keys.auth : "";
    if (!endpoint.startsWith("https://") || !p256dh || !auth || endpoint.length > 1000) {
      return NextResponse.json({ error: "Abunəlik məlumatı yanlışdır" }, { status: 400 });
    }
    // Eyni cihaz başqa hesabla girmişdisə, abunəlik yeni hesaba keçir
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, userId: user.id },
      update: { p256dh, auth, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const b = await req.json().catch(() => ({}));
    const endpoint = typeof b?.endpoint === "string" ? b.endpoint : "";
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
