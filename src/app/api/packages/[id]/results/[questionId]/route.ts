import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string; questionId: string }> };

/**
 * Nəticə cədvəlində bir sual: hər variantı neçə nəfər seçib və kimlər (cədvəldəki kimi hər tələbənin ən yaxşı cəhdi).
 * Adlar yalnız cavab kitabçalarını aça bilənə göstərilir (müəllim, admin və ya "Cavablar hamıya açıq");
 * qalanları say və öz seçimini görür.
 */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id, questionId } = await params;
    const me = await getCurrentUser();
    if (!me) return unauthorized();

    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      select: {
        id: true, shareAnswers: true, isBank: true,
        questions: { where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true } },
      },
    });
    if (!pkg || pkg.isBank) return notFound();
    const num = pkg.questions.findIndex((q) => q.id === questionId) + 1;
    if (num === 0) return notFound();

    const isTeacher = me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, id));
    const isAdmin = me.role === "ADMIN";
    if (!isTeacher && !isAdmin) {
      const done = await prisma.studentAttempt.findFirst({ where: { packageId: id, studentId: me.id, finishedAt: { not: null } }, select: { id: true } });
      if (!done) return forbidden();
    }
    const canSeeNames = isTeacher || isAdmin || pkg.shareAnswers;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, text: true, type: true, options: true, correctAnswer: true, imageUrl: true },
    });
    if (!question) return notFound();

    const attempts = await prisma.studentAttempt.findMany({
      where: { packageId: id, finishedAt: { not: null }, ...(isTeacher || isAdmin ? {} : { student: { deletedAt: null } }) },
      orderBy: { finishedAt: "desc" },
      select: {
        id: true, studentId: true,
        student: { select: { id: true, name: true, photo: true, deletedAt: true } },
        answers: { select: { questionId: true, isCorrect: true, status: true, answer: true } },
      },
    });
    // Cədvəldəki kimi: hər tələbədən ən çox düzgün cavablı cəhd
    const correctOf = (a: (typeof attempts)[number]) => a.answers.filter((x) => x.status !== "PENDING" && x.isCorrect).length;
    const best = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts) {
      const cur = best.get(a.studentId);
      if (!cur || correctOf(a) > correctOf(cur)) best.set(a.studentId, a);
    }

    const picks = [...best.values()].map((a) => {
      const x = a.answers.find((r) => r.questionId === questionId);
      return {
        attemptId: a.id,
        student: { id: a.student.id, name: a.student.name, photo: a.student.photo, deleted: !!a.student.deletedAt },
        mine: a.studentId === me.id,
        answer: x?.answer ?? null,
        state: !x ? "blank" : x.status === "PENDING" ? "pending" : x.isCorrect ? "ok" : "bad",
      };
    }).sort((x, y) => x.student.name.localeCompare(y.student.name));

    // Açıq sualda başqasının yazdığı mətn də gizlədilir; test sualında say üçün seçim qalır
    const hide = <T extends { mine: boolean; student: unknown; attemptId: string; answer: string | null }>(p: T) =>
      canSeeNames || p.mine ? p : { ...p, student: null, attemptId: null, answer: question.type === "OPEN_ENDED" ? null : p.answer };

    return NextResponse.json({
      number: num,
      total: pkg.questions.length,
      canSeeNames,
      question,
      picks: picks.map(hide),
    });
  } catch (error) {
    return serverError(error);
  }
}
