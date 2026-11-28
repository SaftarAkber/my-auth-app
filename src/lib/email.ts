import nodemailer from "nodemailer";

// Google App Password boşluqlu (xxxx xxxx xxxx xxxx) kopyalanır; boşluqları təmizləyirik
function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER?.trim(),
      pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, ""),
    },
  });
}

export async function sendEmailOtp(
  email: string,
  code: string
): Promise<boolean> {
  try {
    await getTransporter().sendMail({
      from: `"Tworing" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Tworing — şifrə bərpa kodu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">🔐 Şifrənin bərpası</h2>
          <p style="color: #555; margin-bottom: 24px;">Aşağıdakı kodu daxil edib yeni şifrə təyin edin.</p>
          <div style="background: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px;">Kod <strong>10 dəqiqə</strong> etibarlıdır.</p>
          <p style="color: #888; font-size: 14px;">Kodu heç kimlə paylaşmayın.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Email gönderme hatası:", error);
    return false;
  }
}