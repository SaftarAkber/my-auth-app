import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import {
  AUTH_COOKIE,
  AUTH_COOKIE_OPTIONS,
  EMAIL_REGEX,
  PHONE_REGEX,
  TEACHER_LIMIT,
} from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : "";
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const password = String(body.password ?? "");
    const role = body.role === "TEACHER" ? "TEACHER" : "STUDENT";

    if (!name || !password) {
      return NextResponse.json({ error: "Ad və şifrə məcburidir" }, { status: 400 });
    }
    if (!phone && !email) {
      return NextResponse.json({ error: "Telefon və ya email məcburidir" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifrə ən azı 6 simvol olmalıdır" }, { status: 400 });
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Telefon beynəlxalq formatda olmalıdır (+994XXXXXXXXX)" },
        { status: 400 },
      );
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email formatı yanlışdır" }, { status: 400 });
    }

    if (role === "TEACHER") {
      const teacherCount = await prisma.user.count({ where: { role: "TEACHER" } });
      if (teacherCount >= TEACHER_LIMIT) {
        return NextResponse.json(
          { error: `Müəllim kontingenti dolub. Maksimum ${TEACHER_LIMIT} müəllim qeydiyyatdan keçə bilər.` },
          { status: 409 },
        );
      }
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu telefon və ya email artıq qeydiyyatdadır" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // İstifadəçi + başlanğıc coin bir transaksiyada
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          phone: phone || null,
          email: email || null,
          password: hashedPassword,
          role,
          coinBalance: role === "TEACHER" ? 500 : 0,
        },
        select: {
          id: true, name: true, phone: true, email: true,
          role: true, bio: true, photo: true, coinBalance: true,
        },
      });
      if (role === "TEACHER") {
        await tx.coinTransaction.create({
          data: { userId: created.id, amount: 500, type: "INITIAL_GRANT", reason: "Qeydiyyat bonusu" },
        });
      }
      return created;
    });

    const token = signToken({ userId: user.id, phone: user.phone || user.email || "" });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
