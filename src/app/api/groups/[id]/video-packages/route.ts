import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { name, description, collectionId } = await req.json();

    if (!name) return NextResponse.json({ error: "Ad məcburidir" }, { status: 400 });

    const pkg = await prisma.videoPackage.create({
      data: {
        name,
        description: description || null,
        groupId,
        collectionId: collectionId || null,
      },
    });

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}