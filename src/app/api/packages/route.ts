import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, description, collectionId, isTimed, duration, startsAt, endsAt } = await req.json();

    if (!name || !collectionId) {
      return NextResponse.json({ error: "İsim ve koleksiyon zorunludur" }, { status: 400 });
    }

    const pkg = await prisma.testPackage.create({
      data: {
        name,
        description,
        collectionId,
        isTimed: isTimed || false,
        duration: duration || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}