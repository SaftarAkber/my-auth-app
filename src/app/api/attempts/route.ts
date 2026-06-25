import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "STUDENT") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { packageId } = await req.json();

    const testPackage = await prisma.testPackage.findUnique({
      where: { id: packageId },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: {
            id: true, text: true, type: true, options: true, order: true,
          },
        },
      },
    });

    if (!testPackage || !testPackage.isPublished) {
      return NextResponse.json({ error: "Test tapılmadı" }, { status: 404 });
    }

    const existing = await prisma.studentAttempt.findFirst({
      where: { studentId: currentUser.id, packageId },
      orderBy: { startedAt: "desc" },
    });

    if (existing) {
      // Tamamlanmış — allowRetry varsa yeni attempt aç, yoxdursa rədd et
      if (existing.finishedAt) {
        if (!(testPackage as any).allowRetry) {
          return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
        }
        // allowRetry=true → yeni attempt yarat
        const attempt = await prisma.studentAttempt.create({
          data: { studentId: currentUser.id, packageId },
        });
        return NextResponse.json({
          attemptId: attempt.id,
          questions: testPackage.questions,
          isTimed: testPackage.isTimed,
          duration: testPackage.duration,
          startedAt: attempt.startedAt,
          isRetry: true,
        });
      }
      // Davam edən cəhd
      return NextResponse.json({
        attemptId: existing.id,
        questions: testPackage.questions,
        isTimed: testPackage.isTimed,
        duration: testPackage.duration,
        startedAt: existing.startedAt,
      });
    }

    // Yeni cəhd
    const attempt = await prisma.studentAttempt.create({
      data: { studentId: currentUser.id, packageId },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      questions: testPackage.questions,
      isTimed: testPackage.isTimed,
      duration: testPackage.duration,
      startedAt: attempt.startedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    if (currentUser.role === "STUDENT") {
      const attempts = await prisma.studentAttempt.findMany({
        where: { studentId: currentUser.id },
        include: {
          package: {
            select: {
              id: true, name: true, isTimed: true, duration: true,
              allowRetry: true,
              group: {
                select: { id: true, name: true, teacher: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });
      return NextResponse.json(attempts);
    }

    // TEACHER
    const attempts = await prisma.studentAttempt.findMany({
      where: {
        package: { group: { teacherId: currentUser.id } },
      },
      include: {
        student: { select: { id: true, name: true, photo: true } },
        package: {
          select: {
            id: true, name: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}