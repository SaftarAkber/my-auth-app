import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { type, value, code } = await req.json();

    if (!type || !value || !code) {
      return NextResponse.json(
        { error: "Tüm alanlar zorunludur" },
        { status: 400 }
      );
    }

    const otpType = type === "phone" ? "PHONE_VERIFY" : "EMAIL_VERIFY";

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: value,
        code,
        used: false,
        type: otpType,
        expiresAt: { gte: new Date() },
        userId: currentUser.id,
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Kod yanlış veya süresi dolmuş" },
        { status: 400 }
      );
    }

    // Güncelle
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: type === "phone" ? { phone: value } : { email: value },
      }),
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ message: "Bilgi başarıyla güncellendi" });
  } catch (error) {
    console.error("Verify contact hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}