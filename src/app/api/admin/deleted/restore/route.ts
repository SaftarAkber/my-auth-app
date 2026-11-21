import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireAdmin, serverError } from "@/lib/guards";

// Admin silinmiş kolleksiya, test paketi və ya istifadəçi hesabını bərpa edir
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

    if (kind === "user") {
      const u = await prisma.user.findFirst({ where: { id, deletedAt: gone }, select: { id: true, deletedContact: true } });
      if (!u) return notFound();
      let c: { phone?: string | null; email?: string | null; groups?: string[] } = {};
      try { c = JSON.parse(u.deletedContact ?? "{}"); } catch { /* köhnə format */ }
      // Silinəndən sonra bu nömrə/email ilə başqa hesab açılıbsa, geri qoymuruq
      const taken = await prisma.user.findMany({
        where: { id: { not: id }, OR: [...(c.phone ? [{ phone: c.phone }] : []), ...(c.email ? [{ email: c.email }] : [])] },
        select: { phone: true, email: true },
      });
      const phone = c.phone && !taken.some((t) => t.phone === c.phone) ? c.phone : null;
      const email = c.email && !taken.some((t) => t.email === c.email) ? c.email : null;
      const groups = c.groups?.length ? await prisma.group.findMany({ where: { id: { in: c.groups } }, select: { id: true } }) : [];
      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { deletedAt: null, deletedContact: null, phone, email } }),
        ...groups.map((g) => prisma.groupMember.upsert({
          where: { groupId_studentId: { groupId: g.id, studentId: id } },
          create: { groupId: g.id, studentId: id },
          update: {},
        })),
      ]);
      const lost = [c.phone && !phone ? "telefon" : null, c.email && !email ? "email" : null].filter(Boolean);
      return NextResponse.json({
        ok: true,
        warning: lost.length ? `Hesab bərpa olundu, amma ${lost.join(" və ")} artıq başqa hesabdadır — redaktə ilə yenisini yazın.` : null,
      });
    }

    return NextResponse.json({ error: "Naməlum növ" }, { status: 400 });
  } catch (error) {
    return serverError(error);
  }
}
