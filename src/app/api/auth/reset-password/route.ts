import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code;
    const newPassword = body.newPassword;
    // email ilə göndərilən kodlar kiçik hərflə saxlanır
    const phone = body.phone ? (String(body.phone).includes("@") ? String(body.phone).trim().toLowerCase() : normalizePhone(String(body.phone))) : body.phone;

    if (!phone || !code || !newPassword) {
      return NextResponse.json(
        { error: "Bütün xanaları doldurun" },
        { status: 400 },
      );
    }

    // 6 rəqəmli kodun brute-force edilməsinin qarşısı
    const limit = await rateLimit(`reset:${phone}`, { windowMs: 15 * 60 * 1000, maxRequests: 8 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çox cəhd edildi. Bir az sonra yenidən yoxlayın." },
        { status: 429 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Şifrə ən azı 6 simvol olmalıdır" },
        { status: 400 },
      );
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code: String(code).trim(),
        used: false,
        type: "RESET_PASSWORD",
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Kod yanlışdır və ya vaxtı bitib. Yeni kod istəyin." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: otpRecord.userId! },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },select: { id: true, name: true, phone: true, email: true, role: true, tokenVersion: true },
      }),
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    const token = signToken({
      userId: updatedUser.id,
      phone: updatedUser.phone ?? "",
      tv: updatedUser.tokenVersion,
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
      message: "Şifrə dəyişdirildi",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Reset password hatası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
