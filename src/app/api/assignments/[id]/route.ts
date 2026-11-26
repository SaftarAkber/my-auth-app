import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";
import { ASSIGNMENT_SELECT } from "@/lib/assignments";
import { cleanAssignmentInput } from "@/lib/assignmentInput";

type Ctx = { params: Promise<{ id: string }> };

async function mine(id: string) {
  const auth = await requireTeacher();
  if ("response" in auth) return { res: auth.response };
  const a = await prisma.assignment.findUnique({ where: { id }, select: { id: true, teacherId: true, deadline: true } });
  if (!a) return { res: notFound() };
  if (a.teacherId !== auth.user.id && auth.user.role !== "ADMIN") return { res: forbidden() };
  return { user: auth.user, a };
}

/** Redaktə: son tarix (uzatmaq), test sayı, coin, qeyd, qruplar və azad edilənlər */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const m = await mine(id);
    if ("res" in m) return m.res;
    const c = await cleanAssignmentInput(await req.json().catch(() => ({})), m.a.teacherId, { partial: true });
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const d = c.data;
    const deadlineChanged = d.deadline && d.deadline.getTime() !== m.a.deadline.getTime();
    const updated = await prisma.$transaction(async (tx) => {
      if (d.groups) {
        await tx.assignmentGroup.deleteMany({ where: { assignmentId: id } });
        await tx.assignmentExempt.deleteMany({ where: { assignmentId: id } });
        await tx.assignmentGroup.createMany({ data: d.groups.map((g) => ({ assignmentId: id, groupId: g.groupId })) });
        const ex = [...new Set(d.groups.flatMap((g) => g.exempt))];
        if (ex.length) await tx.assignmentExempt.createMany({ data: ex.map((studentId) => ({ assignmentId: id, studentId })) });
      }
      return tx.assignment.update({
        where: { id },
        data: {
          ...(d.packageId && { packageId: d.packageId }),
          ...(d.minAttempts && { minAttempts: d.minAttempts }),
          ...(d.deadline && { deadline: d.deadline }),
          ...(d.coinReward !== undefined && { coinReward: d.coinReward }),
          ...(d.note !== undefined && { note: d.note }),
          // Son tarix dəyişəndə xatırlatmalar yeni tarixə görə yenidən göndərilsin
          ...(deadlineChanged && { remind1dAt: null, remind3hAt: null }),
        },
        select: ASSIGNMENT_SELECT,
      });
    });
    return NextResponse.json({ assignment: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const m = await mine(id);
    if ("res" in m) return m.res;
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
