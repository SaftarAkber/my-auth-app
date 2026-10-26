import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

// Nəticə cədvəli: sətir = tələbə, sütun = sual nömrəsi, xana = düzgün / yanlış
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      select: {
        id: true, name: true,
        questions: { where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true } },
      },
    });
    if (!pkg) return notFound();

    const isTeacher = me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, id));
    const isAdmin = me.role === "ADMIN";
    if (!isTeacher && !isAdmin) {
      // Tələbə yalnız testi özü bitiribsə cədvələ baxa bilər
      const done = await prisma.studentAttempt.findFirst({
        where: { packageId: id, studentId: me.id, finishedAt: { not: null } },
        select: { id: true },
      });
      if (!done) return forbidden();
    }

    const attempts = await prisma.studentAttempt.findMany({
      where: { packageId: id, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      select: {
        id: true, score: true, studentId: true,
        student: { select: { id: true, name: true, photo: true } },
        answers: { select: { questionId: true, isCorrect: true, status: true } },
      },
    });

    // Hər tələbədən ən yaxşı nəticə (bərabərdirsə ən son)
    const correctOf = (a: (typeof attempts)[number]) => a.answers.filter((x) => x.status !== "PENDING" && x.isCorrect).length;
    const best = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts) {
      const cur = best.get(a.studentId);
      if (!cur || correctOf(a) > correctOf(cur)) best.set(a.studentId, a);
    }

    const rows = [...best.values()]
      .map((a) => {
        const byQ = new Map(a.answers.map((x) => [x.questionId, x]));
        // true = düzgün, false = yanlış, null = cavabsız, "pending" = yoxlanılır
        const cells = pkg.questions.map((q) => {
          const x = byQ.get(q.id);
          if (!x) return null;
          if (x.status === "PENDING") return "pending" as const;
          return !!x.isCorrect;
        });
        return {
          attemptId: a.id,
          student: a.student,
          cells,
          correct: cells.filter((c) => c === true).length,
          mine: a.studentId === me.id,
        };
      })
      .sort((x, y) => y.correct - x.correct || x.student.name.localeCompare(y.student.name));

    return NextResponse.json({
      package: { id: pkg.id, name: pkg.name },
      total: pkg.questions.length,
      canOpenAll: isTeacher || isAdmin,
      rows,
    });
  } catch (error) {
    return serverError(error);
  }
}
