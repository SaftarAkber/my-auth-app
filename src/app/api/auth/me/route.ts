import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true, name: true, phone: true,
      email: true, role: true, bio: true, photo: true, coverPhoto: true
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, bio, photo, coverPhoto } = await req.json();

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(photo !== undefined && { photo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
      },
      select: {
        id: true, name: true, phone: true,
        email: true, role: true, bio: true, photo: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}