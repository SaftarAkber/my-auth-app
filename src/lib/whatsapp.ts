export async function sendWhatsAppOtp(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const token = process.env.GREEN_API_TOKEN;

    // Telefon formatı: +994501234567 → 994501234567@c.us
    const chatId = phone.replace("+", "") + "@c.us";

    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        message: `🔐 Doğrulama kodunuz: *${code}*\n\nBu kod 10 dəqiqə ərzində etibarlıdır.\nKodu heç kimlə paylaşmayın.`,
      }),
    });

    const data = await response.json();

    if (data.idMessage) {
      return true;
    }

    console.error("Green API xətası:", data);
    return false;
  } catch (error) {
    console.error("WhatsApp göndərme xətası:", error);
    return false;
  }
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}