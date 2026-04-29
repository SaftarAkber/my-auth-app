import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Telefon/Email ve şifre zorunludur" },
        { status: 400 }
      );
    }

    // Telefon mu email mi?
    const isPhone = identifier.startsWith("+");

    const user = await prisma.user.findFirst({
      where: isPhone ? { phone: identifier } : { email: identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya şifre yanlış" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya şifre yanlış" },
        { status: 401 }
      );
    }

    const token = signToken({ userId: user.id, phone: user.phone || user.email || "" });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}