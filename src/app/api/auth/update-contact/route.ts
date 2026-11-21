import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendWhatsAppOtp, generateOtpCode } from "@/lib/whatsapp";
import { sendEmailOtp } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
    }

    const { type, value } = await req.json();
    // type: "phone" veya "email"
    // value: yeni numara veya email

    if (!type || !value) {
      return NextResponse.json(
        { error: "Növ və dəyər məcburidir" },
        { status: 400 }
      );
    }

    // Zaten başkası kullanıyor mu?
    const existing = await prisma.user.findFirst({
      where: type === "phone" ? { phone: value } : { email: value },
    });

    if (existing && existing.id !== currentUser.id) {
      return NextResponse.json(
        { error: "Bu məlumat artıq başqa hesabda istifadə olunur" },
        { status: 409 }
      );
    }

    // OTP oluştur
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.deleteMany({
      where: { phone: value, used: false },
    });

    await prisma.otpCode.create({
      data: {
        code,
        phone: value,
        type: type === "phone" ? "PHONE_VERIFY" : "EMAIL_VERIFY",
        expiresAt,
        userId: currentUser.id,
      },
    });

    // Gönder
    let sent = false;
    if (type === "phone") {
      sent = await sendWhatsAppOtp(value, code);
    } else {
      sent = await sendEmailOtp(value, code);
    }

    if (!sent) {
      return NextResponse.json(
        { error: "Kod göndərilmədi. Bir az sonra yenidən yoxlayın." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Doğrulama kodu göndərildi" });
  } catch (error) {
    console.error("Update contact hatası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}