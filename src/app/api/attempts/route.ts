import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, requireStudent, serverError, unauthorized } from "@/lib/guards";
import { closeExpiredAttempts, drawBankQuestions, draftOf, finishAttempt, isExpired } from "@/lib/attempts";

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
        _count: { select: { questions: { where: { isActive: true } } } },
      },
    });

    if (!testPackage || !testPackage.isPublished || testPackage.deletedAt) {
      return NextResponse.json({ error: "Test tapılmadı" }, { status: 404 });
    }
    if (testPackage._count.questions === 0) {
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

    const qSelect = { id: true, text: true, type: true, options: true, imageUrl: true, order: true } as const;
    const payload = async (
      attempt: { id: string; startedAt: Date; questionIds: string[]; draft: unknown },
      extra = {},
    ) => {
      let questions;
      if (attempt.questionIds.length) {
        // Bank: seçilmiş suallar seçim sırası ilə
        const rows = await prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, select: qSelect });
        const byId = new Map(rows.map((q) => [q.id, q]));
        questions = attempt.questionIds.flatMap((id, i) => {
          const q = byId.get(id);
          return q ? [{ ...q, order: i }] : [];
        });
      } else {
        questions = await prisma.question.findMany({ where: { packageId, isActive: true }, orderBy: { order: "asc" }, select: qSelect });
      }
      return {
        attemptId: attempt.id,
        questions,
        isTimed: testPackage.isTimed,
        duration: testPackage.duration,
        startedAt: attempt.startedAt,
        answers: draftOf(attempt.draft as never),
        isBank: testPackage.isBank,
        ...extra,
      };
    };

    let latest = await prisma.studentAttempt.findFirst({
      where: { studentId: user.id, packageId },
      orderBy: { startedAt: "desc" },
    });

    // Davam edən cəhd: vaxt varsa qaldığı yerdən; vaxt bitibsə bitmiş sayılır (cavabsızlar səhv)
    if (latest && !latest.finishedAt) {
      if (!isExpired(latest.startedAt, testPackage)) return NextResponse.json(await payload(latest));
      await finishAttempt(latest.id, null);
      latest = await prisma.studentAttempt.findUnique({ where: { id: latest.id } });
    }

    // Tamamlanıb: bankda həmişə yeni cəhd; adi testdə təkrar icazəsi lazımdır
    if (latest?.finishedAt && !testPackage.allowRetry && !testPackage.isBank) {
      return NextResponse.json({ error: "Test artıq tamamlanıb" }, { status: 409 });
    }

    const questionIds = testPackage.isBank ? await drawBankQuestions(testPackage, user.id) : [];
    if (testPackage.isBank && questionIds.length === 0) {
      return NextResponse.json({ error: "Bu testdə hələ sual yoxdur" }, { status: 400 });
    }
    const attempt = await prisma.studentAttempt.create({
      data: { studentId: user.id, packageId, questionIds },
    });
    return NextResponse.json(await payload(attempt, latest ? { isRetry: true } : {}));
  } catch (error) {
    return serverError(error);
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    if (currentUser.role === "STUDENT") {
      await closeExpiredAttempts({ studentId: currentUser.id });
      const attempts = await prisma.studentAttempt.findMany({
        where: { studentId: currentUser.id, package: { deletedAt: null } },
        include: {
          package: {
            select: {
              id: true, name: true, isTimed: true, duration: true, allowRetry: true, isBank: true, isMonthly: true,
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
          deletedAt: null,
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
