import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/**
 * "Sualları sıfırla": paketin bütün sualları təmizlənir, amma tələbələrin tarixçəsi dəyişmir.
 * Heç bir cəhddə olmayan sual silinir; cəhdə düşmüş və ya cavablanmış sual arxivə keçir
 * (isActive=false, archivedAt) – redaktorda və yeni testlərdə görünmür, cavab kitabçası və reytinq olduğu kimi qalır.
 * Paketin özü, ayarları, cəhdləri və cədvəli dəyişmir; sonra yeni suallar yüklənir.
 */
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    const [questions, attempts] = await Promise.all([
      prisma.question.findMany({ where: { packageId: id, archivedAt: null }, select: { id: true, _count: { select: { answers: true } } } }),
      prisma.studentAttempt.findMany({ where: { packageId: id }, select: { questionIds: true } }),
    ]);
    const drawn = new Set(attempts.flatMap((a) => a.questionIds));
    const keep = questions.filter((q) => q._count.answers > 0 || drawn.has(q.id)).map((q) => q.id);
    const drop = questions.filter((q) => q._count.answers === 0 && !drawn.has(q.id)).map((q) => q.id);

    let deleted = 0;
    for (let i = 0; i < drop.length; i += 500) deleted += (await prisma.question.deleteMany({ where: { id: { in: drop.slice(i, i + 500) }, packageId: id } })).count;
    const archived = keep.length
      ? (await prisma.question.updateMany({ where: { id: { in: keep }, packageId: id }, data: { isActive: false, archivedAt: new Date() } })).count
      : 0;
    return NextResponse.json({ deleted, archived });
  } catch (error) {
    return serverError(error);
  }
}
