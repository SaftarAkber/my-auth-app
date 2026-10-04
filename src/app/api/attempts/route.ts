import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, requireStudent, serverError, unauthorized } from "@/lib/guards";

// Test cəhdini başlat (və ya davam edəni qaytar)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;
    const { user } = auth;

    const { packageId } = await req.json();
    if (!packageId) {
      return NextResponse.json({ error: "Test seçilməyib" }, { status: 400 });
    }

    const testPackage = await prisma.testPackage.findUnique({
      where: { id: packageId },
      include: {
        testPackageGroups: { select: { groupId: true } },
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { id: true, text: true, type: true, options: true, order: true },
        },
      },
    });

    if (!testPackage || !testPackage.isPublished) {
      return NextResponse.json({ error: "Test tapılmadı" }, { status: 404 });
    }
    if (testPackage.questions.length === 0) {
      return NextResponse.json({ error: "Bu testdə hələ sual yoxdur" }, { status: 400 });
    }

    // Giriş icazəsi: açıq test və ya bağlı qrupun üzvü
    if (testPackage.visibility === "GROUP_ONLY") {
      const groupIds = [
        ...testPackage.testPackageGroups.map((g) => g.groupId),
        ...(testPackage.groupId ? [testPackage.groupId] : []),
      ];
      const membership = await prisma.groupMember.findFirst({
        where: { studentId: user.id, groupId: { in: groupIds } },
        select: { id: true },
      });
      if (!membership) return forbidden();
    }

    // Vaxt pəncərəsi
    const now = new Date();
    if (testPackage.startsAt && testPackage.startsAt > now) {
      return NextResponse.json({ error: "Test hələ başlamayıb" }, { status: 403 });
    }
    if (testPackage.endsAt && testPackage.endsAt < now) {
      return NextResponse.json({ error: "Testin vaxtı bitib" }, { status: 403 });
    }

    const payload = (attempt: { id: string; startedAt: Date }, extra = {}) => ({
      attemptId: attempt.id,
      questions: testPackage.questions,
      isTimed: testPackage.isTimed,
      duration: testPackage.duration,
      startedAt: attempt.startedAt,
      ...extra,
    });

    const latest = await prisma.studentAttempt.findFirst({
      where: { studentId: user.id, packageId },
      orderBy: { startedAt: "desc" },
    });

    // Davam edən cəhd
    if (latest && !latest.finishedAt) {
      return NextResponse.json(payload(latest));
    }

    // Tamamlanıb — təkrar icazəsi yoxdursa rədd et
    if (latest?.finishedAt && !testPackage.allowRetry) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    const attempt = await prisma.studentAttempt.create({
      data: { studentId: user.id, packageId },
    });
    return NextResponse.json(payload(attempt, latest ? { isRetry: true } : {}));
  } catch (error) {
    return serverError(error);
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    if (currentUser.role === "STUDENT") {
      const attempts = await prisma.studentAttempt.findMany({
        where: { studentId: currentUser.id },
        include: {
          package: {
            select: {
              id: true, name: true, isTimed: true, duration: true, allowRetry: true,
              group: { select: { id: true, name: true, teacher: { select: { name: true } } } },
              testPackageGroups: { select: { group: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });
      return NextResponse.json(attempts);
    }

    // Müəllim: bütün sahib olduğu testlərin cəhdləri
    const attempts = await prisma.studentAttempt.findMany({
      where: {
        package: {
          OR: [
            { collection: { teacherId: currentUser.id } },
            { group: { teacherId: currentUser.id } },
          ],
        },
      },
      include: {
        student: { select: { id: true, name: true, photo: true } },
        package: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
      },
      orderBy: { startedAt: "desc" },
    });
    return NextResponse.json(attempts);
  } catch (error) {
    return serverError(error);
  }
}
