import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, optionalUser, serverError, unauthorized } from "@/lib/guards";
import { attemptAccess } from "@/lib/reviewComments";
import { later, sendPush } from "@/lib/push";

type Ctx = { params: Promise<{ id: string }> };

/** "Qeydləri göndər": bu kitabçadakı bütün qaralamalar göndərilir, tələbəyə BİR bildiriş gedir */
export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await optionalUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const acc = await attemptAccess(user, id);
    if (!acc) return notFound();
    if (!acc.teacher) return forbidden();

    const r = await prisma.reviewComment.updateMany({
      where: { attemptId: id, sentAt: null, ...(user.role === "ADMIN" ? {} : { teacherId: user.id }) },
      data: { sentAt: new Date() },
    });
    if (r.count > 0) {
      const n = await prisma.reviewComment.groupBy({ by: ["questionId"], where: { attemptId: id, sentAt: { not: null } } });
      later(() =>
        sendPush([acc.attempt.studentId], {
          title: "Müəllim şərh yazdı",
          body: `“${acc.attempt.package.name}”: ${n.length} suala şərh`,
          url: `/student/attempts/${id}`,
          tag: `review-${id}`,
        }),
      );
    }
    return NextResponse.json({ sent: r.count });
  } catch (error) {
    return serverError(error);
  }
}
