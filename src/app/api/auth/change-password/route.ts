import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { cookies } from "next/headers";
import { signToken } from "@/lib/jwt";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const limit = await rateLimit(`chpw:${currentUser.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Çox cəhd. Bir az sonra yenidən yoxlayın." }, { status: 429 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Bütün sahələri doldurun" }, { status: 400 });
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: "Yeni şifrə ən azı 6 simvol olmalıdır" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: "Cari şifrə yanlışdır" }, { status: 400 });
    }

    // tokenVersion artır: başqa cihazlardakı girişlər bağlanır, bu cihaz üçün yeni token verilir
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12), tokenVersion: { increment: 1 } },
      select: { id: true, phone: true, email: true, tokenVersion: true },
    });
    (await cookies()).set(
      AUTH_COOKIE,
      signToken({ userId: updated.id, phone: updated.phone || updated.email || "", tv: updated.tokenVersion }),
      AUTH_COOKIE_OPTIONS,
    );

    return NextResponse.json({ message: "Şifrə dəyişdirildi. Digər cihazlardakı girişlər bağlandı." });
  } catch (error) {
    console.error("Change password xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
