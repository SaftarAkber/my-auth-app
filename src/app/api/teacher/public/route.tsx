import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacher = await prisma.user.findFirst({
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
        bio: true,
        photo: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error("Teacher public hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}