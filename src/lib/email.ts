import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmailOtp(
  email: string,
  code: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Auth App" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Şifre Sıfırlama Kodu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">🔐 Şifre Sıfırlama</h2>
          <p style="color: #555; margin-bottom: 24px;">Aşağıdaki kodu kullanarak şifrenizi sıfırlayabilirsiniz.</p>
          <div style="background: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px;">Bu kod <strong>10 dakika</strong> geçerlidir.</p>
          <p style="color: #888; font-size: 14px;">Kodu kimseyle paylaşmayın.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Email gönderme hatası:", error);
    return false;
  }
}