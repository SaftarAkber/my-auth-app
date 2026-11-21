import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { EMAIL_REGEX, PHONE_REGEX, normalizePhone } from "@/lib/config";
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
      const phone = normalizePhone(String(b.phone));
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
    // Admin istifadəçiyə yeni parol təyin edə bilər (köhnəsi görünmür: bazada yalnız geri çevrilməyən izi saxlanır)
    if (b.password !== undefined && b.password !== "") {
      const pw = String(b.password);
      if (pw.length < 6) return NextResponse.json({ error: "Parol ən azı 6 simvol olmalıdır" }, { status: 400 });
      if (pw.length > 100) return NextResponse.json({ error: "Parol çox uzundur" }, { status: 400 });
      data.password = await bcrypt.hash(pw, 12);
      // İstifadəçinin bütün cihazlardakı girişləri bağlanır
      data.tokenVersion = { increment: 1 };
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

/**
 * DELETE /api/admin/users/:id            — yumşaq silmə: hesab bağlanır, tələbələrə heç yerdə görünmür,
 *   telefon/email boşaldılır (eyni nömrə ilə yenidən qeydiyyat mümkündür), qrup üzvlükləri çıxarılır;
 *   hamısı deletedContact-da saxlanır ki, "Silinənlər"dən bərpa olunsun. Coin, nəticə və şərhlər qalır.
 * DELETE /api/admin/users/:id?permanent=1 — artıq silinmiş hesabı birdəfəlik silir (bütün tarixçəsi ilə).
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (id === auth.user.id) {
      return NextResponse.json({ error: "Öz hesabınızı silə bilməzsiniz" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, email: true, deletedAt: true, groupMembers: { select: { groupId: true } } },
    });
    if (!user) return notFound("İstifadəçi tapılmadı");

    if (new URL(req.url).searchParams.get("permanent") === "1") {
      if (!user.deletedAt) return NextResponse.json({ error: "Əvvəlcə hesabı silin, sonra “Silinənlər”dən birdəfəlik silmək olar" }, { status: 400 });
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ message: "Hesab birdəfəlik silindi" });
    }
    if (user.deletedAt) return NextResponse.json({ message: "Hesab artıq silinib" });

    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { studentId: id } }),
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedContact: JSON.stringify({ phone: user.phone, email: user.email, groups: user.groupMembers.map((m) => m.groupId) }),
          phone: null,
          email: null,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);
    return NextResponse.json({ message: "Hesab silindi. “Silinənlər” bölməsindən bərpa etmək olar." });
  } catch (error) {
    return serverError(error);
  }
}
