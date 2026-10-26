import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { rateLimit } from "@/lib/rateLimit";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from "@/lib/config";

// Admin yalnız bu endpoint ilə daxil ola bilir (/admin və ya /dashboard səhifəsindəki forma).
// Adi /login admin hesabını qəbul etmir.
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const id = String(username ?? "").trim();
    if (!id || !password) {
      return NextResponse.json({ error: "İstifadəçi adı və parol məcburidir" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const limit = rateLimit(`admin-login:${ip}:${id.toLowerCase()}`, { windowMs: 15 * 60 * 1000, maxRequests: 6 });
    if (!limit.allowed) {
      const mins = Math.ceil(limit.retryAfterMs / 60000);
      return NextResponse.json({ error: `Çox cəhd edildi. ${mins} dəqiqə sonra yenidən yoxlayın.` }, { status: 429 });
    }

    // Admin istifadəçi adı phone sütununda saxlanılır (make-admin ilə çevrilmiş hesablar email/telefonla da girir)
    const user = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        OR: [{ phone: { equals: id, mode: "insensitive" } }, ...(id.includes("@") ? [{ email: id.toLowerCase() }] : [])],
      },
    });
    const valid = user ? await bcrypt.compare(String(password), user.password) : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "İstifadəçi adı və ya parol yanlışdır" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, phone: user.phone ?? "" });
    (await cookies()).set(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);

    return NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email, bio: user.bio, photo: user.photo, coinBalance: user.coinBalance },
    });
  } catch (error) {
    console.error("Admin login xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
