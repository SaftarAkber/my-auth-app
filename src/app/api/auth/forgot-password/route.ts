import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOtp, generateOtpCode } from "@/lib/whatsapp";
import { sendEmailOtp } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/config";

// Şifrə bərpası: WhatsApp (telefon) və ya email ilə 6 rəqəmli kod göndərilir, 10 dəqiqə etibarlıdır
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const method = body.method === "email" ? "email" : body.method === "whatsapp" ? "whatsapp" : null;
    // Bazada telefon +994XXXXXXXXX, email kiçik hərflə saxlanır — istifadəçinin yazdığını eyni formata gətiririk
    const phone = body.phone ? normalizePhone(String(body.phone)) : "";
    const email = body.email ? String(body.email).trim().toLowerCase() : "";

    if (!method) return NextResponse.json({ error: "Kodu necə almaq istədiyinizi seçin" }, { status: 400 });
    if (method === "whatsapp" && !phone) return NextResponse.json({ error: "Telefon nömrəsini daxil edin" }, { status: 400 });
    if (method === "email" && !email) return NextResponse.json({ error: "Email ünvanını daxil edin" }, { status: 400 });

    const ip = clientIp(req);
    const limitResult = await rateLimit(`otp:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (!limitResult.allowed) {
      const mins = Math.ceil(limitResult.retryAfterMs / 60000);
      return NextResponse.json({ error: `Çox cəhd edildi. ${mins} dəqiqə sonra yenidən yoxlayın.` }, { status: 429 });
    }

    const user = await prisma.user.findFirst({
      where: method === "whatsapp" ? { phone } : { email },
      select: { id: true, email: true, phone: true },
    });
    if (!user) {
      return NextResponse.json(
        {
          error: method === "whatsapp"
            ? "Bu nömrə ilə hesab tapılmadı. Nömrəni +994501234567 formatında yoxlayın və ya Email ilə cəhd edin."
            : "Bu email ilə hesab tapılmadı. Qeydiyyatda telefon yazmısınızsa, WhatsApp ilə cəhd edin.",
        },
        { status: 404 },
      );
    }

    const identifier = method === "whatsapp" ? phone : email;

    const recentOtp = await prisma.otpCode.findFirst({
      where: { phone: identifier, used: false, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentOtp) return NextResponse.json({ error: "Kod artıq göndərilib. 1 dəqiqə sonra yenidən göndərə bilərsiniz." }, { status: 429 });

    await prisma.otpCode.deleteMany({ where: { phone: identifier, used: false } });

    const code = generateOtpCode();
    const otp = await prisma.otpCode.create({
      data: { code, phone: identifier, type: "RESET_PASSWORD", expiresAt: new Date(Date.now() + 10 * 60 * 1000), userId: user.id },
    });

    const sent = method === "whatsapp" ? await sendWhatsAppOtp(phone, code) : await sendEmailOtp(email, code);
    if (!sent) {
      // Göndərilməyən kod 1 dəqiqəlik gözləməyə səbəb olmasın
      await prisma.otpCode.delete({ where: { id: otp.id } }).catch(() => null);
      return NextResponse.json(
        { error: method === "whatsapp" ? "WhatsApp mesajı göndərilmədi. Bir az sonra yenidən yoxlayın və ya Email seçin." : "Email göndərilmədi. Bir az sonra yenidən yoxlayın." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: method === "whatsapp" ? "Kod WhatsApp-a göndərildi" : "Kod emailə göndərildi",
      identifier,
    });
  } catch (error) {
    console.error("Forgot password xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
