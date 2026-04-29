import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Test başlat
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "STUDENT") {
      return NextResponse.json({ error: "Səlahiyyətiniz yoxdur" }, { status: 401 });
    }

    const { packageId } = await req.json();

    // Artıq həll edilibmi?
    const existing = await prisma.studentAttempt.findUnique({
      where: { studentId_packageId: { studentId: currentUser.id, packageId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Bu test artıq həll edilib", attempt: existing }, { status: 409 });
    }

    const attempt = await prisma.studentAttempt.create({
      data: { studentId: currentUser.id, packageId },
    });

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

// Tələbənin bütün cəhdlərini (attempts) gətir
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Səlahiyyətiniz yoxdur" }, { status: 401 });

    const attempts = await prisma.studentAttempt.findMany({
      where: { studentId: currentUser.id },
      include: {
        package: {
          include: { collection: { select: { name: true } } },
        },
        answers: {
          include: { question: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}