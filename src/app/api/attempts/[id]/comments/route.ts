import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { attemptAccess, cleanCommentInput, COMMENT_SELECT, wrongQuestionIds } from "@/lib/reviewComments";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET — kitabçanın şərhləri.
 *   Müəllim: bu cəhdin bütün şərhləri (qaralamalar da) + bu cəhddəki suallara göndərilmiş "hamıya" şərhləri.
 *   Tələbə: yalnız göndərilmiş şərhlər; "hamıya" şərhi yalnız səhv/cavabsız qoyduğu suallarda.
 */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const acc = await attemptAccess(user, id);
    if (!acc) return notFound();
    if (!acc.teacher && !acc.owner) return NextResponse.json({ comments: [], canEdit: false, drafts: 0 });

    const wrong = await wrongQuestionIds(acc.attempt);
    const questionIds = acc.attempt.questionIds.length
      ? acc.attempt.questionIds
      : (await prisma.question.findMany({ where: { packageId: acc.attempt.packageId }, select: { id: true } })).map((q) => q.id);

    const rows = await prisma.reviewComment.findMany({
      where: {
        OR: [
          { attemptId: id, ...(acc.teacher ? {} : { sentAt: { not: null } }) },
          { scope: "WRONG_ALL", sentAt: { not: null }, attemptId: { not: id }, questionId: { in: acc.teacher ? questionIds : [...wrong] } },
        ],
      },
      select: COMMENT_SELECT,
      orderBy: { createdAt: "asc" },
    });
    // Tələbəyə: "hamıya" şərhi düz cavab verdiyi sualda görünmür (öz cəhdində yazılmış olsa belə)
    const comments = acc.teacher ? rows : rows.filter((c) => c.scope === "ATTEMPT" || wrong.has(c.questionId));
    return NextResponse.json({
      comments,
      canEdit: acc.teacher,
      drafts: acc.teacher ? comments.filter((c) => !c.sentAt && c.attemptId === id).length : 0,
      wrong: [...wrong],
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST — yeni şərh (qaralama). Yalnız müəllim. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const acc = await attemptAccess(user, id);
    if (!acc) return notFound();
    if (!acc.teacher) return forbidden();

    const b = await req.json().catch(() => ({}));
    const questionId = typeof b.questionId === "string" ? b.questionId : "";
    const inAttempt = acc.attempt.questionIds.length
      ? acc.attempt.questionIds.includes(questionId)
      : !!(await prisma.question.findFirst({ where: { id: questionId, packageId: acc.attempt.packageId }, select: { id: true } }));
    if (!inAttempt) return NextResponse.json({ error: "Sual bu testdə deyil" }, { status: 400 });

    const c = await cleanCommentInput(b, user.id);
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const comment = await prisma.reviewComment.create({
      data: { ...c.data, attemptId: id, questionId, teacherId: user.id },
      select: COMMENT_SELECT,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

/** DELETE — göndərilməmiş qaralamaları sil ("Qeyd etmə"). */
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const acc = await attemptAccess(user, id);
    if (!acc) return notFound();
    if (!acc.teacher) return forbidden();
    const r = await prisma.reviewComment.deleteMany({ where: { attemptId: id, sentAt: null, ...(user.role === "ADMIN" ? {} : { teacherId: user.id }) } });
    return NextResponse.json({ deleted: r.count });
  } catch (error) {
    return serverError(error);
  }
}
