import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EMAIL_REGEX, PHONE_REGEX } from "@/lib/config";
import { notFound, requireAdmin, serverError } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { id } = await params;

    const b = await req.json();
    const data: Prisma.UserUpdateInput = {};

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return NextResponse.json({ error: "Ad boş ola bilməz" }, { status: 400 });
      data.name = name.slice(0, 120);
    }
    if (b.phone !== undefined) {
      const phone = String(b.phone).trim();
      if (phone && !PHONE_REGEX.test(phone)) {
        return NextResponse.json({ error: "Telefon beynəlxalq formatda olmalıdır (+994XXXXXXXXX)" }, { status: 400 });
      }
      data.phone = phone || null;
    }
    if (b.email !== undefined) {
      const email = String(b.email).trim().toLowerCase();
      if (email && !EMAIL_REGEX.test(email)) return NextResponse.json({ error: "Email formatı yanlışdır" }, { status: 400 });
      data.email = email || null;
    }
    if (b.bio !== undefined) data.bio = String(b.bio).slice(0, 1000);
    if (b.role !== undefined) {
      if (!["STUDENT", "TEACHER", "ADMIN"].includes(b.role)) return NextResponse.json({ error: "Rol yanlışdır" }, { status: 400 });
      if (id === auth.user.id && b.role !== "ADMIN") {
        return NextResponse.json({ error: "Öz admin rolunuzu götürə bilməzsiniz" }, { status: 400 });
      }
      data.role = b.role;
    }

    let newBalance: number | undefined;
    if (b.coinBalance !== undefined) {
      newBalance = Math.floor(Number(b.coinBalance));
      if (!Number.isFinite(newBalance) || newBalance < 0 || newBalance > 10_000_000) {
        return NextResponse.json({ error: "Coin balansı yanlışdır" }, { status: 400 });
      }
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const before = await tx.user.findUnique({ where: { id }, select: { coinBalance: true } });
        if (!before) return null;
        if (newBalance !== undefined && newBalance !== before.coinBalance) {
          data.coinBalance = newBalance;
          await tx.coinTransaction.create({
            data: { userId: id, amount: newBalance - before.coinBalance, type: "ADMIN_ADJUST", reason: "Admin düzəlişi" },
          });
        }
        return tx.user.update({
          where: { id },
          data,
          select: { id: true, name: true, phone: true, email: true, role: true, bio: true, coinBalance: true },
        });
      });
      if (!user) return notFound("İstifadəçi tapılmadı");
      return NextResponse.json({ user });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ error: "Bu telefon və ya email başqa hesabda var" }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (id === auth.user.id) {
      return NextResponse.json({ error: "Öz hesabınızı silə bilməzsiniz" }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound("İstifadəçi tapılmadı");
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "Hesab silindi" });
  } catch (error) {
    return serverError(error);
  }
}
