import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";
import { ASSIGNMENT_SELECT, countedAttempts } from "@/lib/assignments";

type Ctx = { params: Promise<{ id: string; sid: string }> };

/** Müəllim: tələbənin bu tapşırığa sayılan cəhdləri (faiz, düz sayı, tarix) */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id, sid } = await params;
    const a = await prisma.assignment.findUnique({ where: { id }, select: ASSIGNMENT_SELECT });
    if (!a) return notFound();
    if (a.teacherId !== auth.user.id && auth.user.role !== "ADMIN") return forbidden();
    const attempts = (await countedAttempts(a, [sid])).get(sid) ?? [];
    const reward = await prisma.assignmentReward.findUnique({ where: { assignmentId_studentId: { assignmentId: id, studentId: sid } }, select: { coins: true } });
    return NextResponse.json({ attempts, minAttempts: a.minAttempts, coins: reward?.coins ?? 0 });
  } catch (error) {
    return serverError(error);
  }
}
