import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOtp, generateOtpCode } from "@/lib/whatsapp";
import { sendEmailOtp } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const { phone, email, method } = await req.json();

    // method: "whatsapp" veya "email"
    if (!method) {
      return NextResponse.json(
        { error: "Doğrulama yöntemi seçin" },
        { status: 400 }
      );
    }

    if (method === "whatsapp" && !phone) {
      return NextResponse.json(
        { error: "Telefon numarası zorunludur" },
        { status: 400 }
      );
    }

    if (method === "email" && !email) {
      return NextResponse.json(
        { error: "Email zorunludur" },
        { status: 400 }
      );
    }

    // Rate limit
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const limitResult = rateLimit(`otp:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });

    if (!limitResult.allowed) {
      const secs = Math.ceil(limitResult.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Çok fazla deneme. ${secs} saniye sonra tekrar deneyin.` },
        { status: 429 }
      );
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findFirst({
      where: method === "whatsapp" ? { phone } : { email },
    });

    // Güvenlik: bulunamasa da aynı cevabı ver
    if (!user) {
      return NextResponse.json({
        message: "Kayıtlıysa kod gönderilecek",
      });
    }

    // Email metodu seçildiyse email olmalı
    if (method === "email" && !user.email) {
      return NextResponse.json(
        { error: "Bu hesapta kayıtlı email yok" },
        { status: 400 }
      );
    }

    // Son 60 saniyede kod gönderildi mi?
    const identifier = method === "whatsapp" ? phone : email;
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        phone: identifier,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        used: false,
      },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: "Lütfen 1 dakika bekleyin" },
        { status: 429 }
      );
    }

    // Eski kodları sil
    await prisma.otpCode.deleteMany({
      where: { phone: identifier, used: false },
    });

    // Yeni OTP oluştur
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        code,
        phone: identifier,
        type: "RESET_PASSWORD",
        expiresAt,
        userId: user.id,
      },
    });

    // Gönder
    let sent = false;
    if (method === "whatsapp") {
      sent = await sendWhatsAppOtp(phone, code);
    } else {
      sent = await sendEmailOtp(user.email!, code);
    }

    if (!sent) {
      return NextResponse.json(
        { error: "Kod gönderilemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: method === "whatsapp"
        ? "WhatsApp mesajı gönderildi"
        : "Email gönderildi",
    });
  } catch (error) {
    console.error("Forgot password hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}