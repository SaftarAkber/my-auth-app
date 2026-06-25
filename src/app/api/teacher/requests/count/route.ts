import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const count = await prisma.enrollmentRequest.count({
      where: { teacherId: currentUser.id, status: "PENDING" },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}