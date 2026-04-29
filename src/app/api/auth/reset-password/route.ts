import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { phone, code, newPassword } = await req.json();

    if (!phone || !code || !newPassword) {
      return NextResponse.json(
        { error: "Tüm alanları doldurun" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 },
      );
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        type: "RESET_PASSWORD",
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Kod yanlış veya süresi dolmuş" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: otpRecord.userId! },
        data: { password: hashedPassword },
        select: { id: true, name: true, phone: true, email: true },
      }),
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    const token = signToken({
      userId: updatedUser.id,
      phone: updatedUser.phone ?? "",
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      message: "Şifre başarıyla değiştirildi",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Reset password hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
