import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, password, role } = await req.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "Ad ve şifre zorunludur" },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Telefon veya email zorunludur" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }

    if (phone) {
      const phoneRegex = /^\+[1-9]\d{7,14}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: "Telefon numarası uluslararası formatta olmalıdır (+994XXXXXXXXX)" },
          { status: 400 }
        );
      }
    }

    // Teacher limiti — sadece 1 teacher olabilir
    if (role === "TEACHER") {
      const teacherCount = await prisma.user.count({
        where: { role: "TEACHER" },
      });
      if (teacherCount >= 1) {
        return NextResponse.json(
          { error: "Öğretmen kontenjanı doldu. Sadece 1 öğretmen kayıt olabilir." },
          { status: 409 }
        );
      }
    }

    // Mevcut kullanıcı kontrolü
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu telefon veya email zaten kayıtlı" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        password: hashedPassword,
        role: role === "TEACHER" ? "TEACHER" : "STUDENT",
      },
      select: {
        id: true, name: true, phone: true, email: true, role: true,
      },
    });

    const token = signToken({ userId: user.id, phone: user.phone || user.email || "" });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}