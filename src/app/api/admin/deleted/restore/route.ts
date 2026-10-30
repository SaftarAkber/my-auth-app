import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireAdmin, serverError } from "@/lib/guards";

// Admin silinmiş kolleksiya və ya test paketini bərpa edir
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const { kind, id } = await req.json();
    const live = { deletedAt: null, deletedById: null };
    const gone = { not: null } as const;

    if (kind === "collection") {
      const c = await prisma.collection.findFirst({ where: { id, deletedAt: gone }, select: { id: true, deletedAt: true } });
      if (!c) return notFound();
      await prisma.$transaction([
        // kolleksiya ilə eyni anda silinmiş paketlər də qayıdır
        prisma.testPackage.updateMany({ where: { collectionId: id, deletedAt: c.deletedAt }, data: live }),
        prisma.collection.update({ where: { id }, data: live }),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (kind === "package") {
      const p = await prisma.testPackage.findFirst({ where: { id, deletedAt: gone }, select: { id: true, collectionId: true } });
      if (!p) return notFound();
      await prisma.$transaction([
        // paket silinmiş kolleksiyadadırsa, görünsün deyə kolleksiya da qayıdır (qalan paketlər yox)
        ...(p.collectionId
          ? [prisma.collection.updateMany({ where: { id: p.collectionId, deletedAt: gone }, data: live })]
          : []),
        prisma.testPackage.update({ where: { id }, data: live }),
      ]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Naməlum növ" }, { status: 400 });
  } catch (error) {
    return serverError(error);
  }
}
