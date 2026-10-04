import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { rateLimit } from "@/lib/rateLimit";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Telefon/Email və şifrə məcburidir" },
        { status: 400 },
      );
    }

    // Brute-force qorunması: IP + identifier üzrə 10 cəhd / 15 dəq
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const limit = rateLimit(`login:${ip}:${String(identifier).toLowerCase()}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    });
    if (!limit.allowed) {
      const mins = Math.ceil(limit.retryAfterMs / 60000);
      return NextResponse.json(
        { error: `Çox cəhd edildi. ${mins} dəqiqə sonra yenidən yoxlayın.` },
        { status: 429 },
      );
    }

    const id = String(identifier).trim();
    const isEmail = id.includes("@");

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: id.toLowerCase() } : { phone: id },
    });

    const valid = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !valid) {
      return NextResponse.json(
        { error: "İstifadəçi tapılmadı və ya şifrə yanlışdır" },
        { status: 401 },
      );
    }

    const token = signToken({ userId: user.id, phone: user.phone || user.email || "" });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        bio: user.bio,
        photo: user.photo,
        coinBalance: user.coinBalance,
      },
    });
  } catch (error) {
    console.error("Login xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
