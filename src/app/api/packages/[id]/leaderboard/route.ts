import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { countsForRanking, drawTotal } from "@/lib/attempts";
import { forbidden, notFound, serverError, teacherOwnsTestPackage, unauthorized } from "@/lib/guards";
import { pct1, rankRows } from "@/lib/ranking";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sual bankının reytinqi: testin açıq olduğu qrupların bütün tələbələri (və hərkəsə açıqdırsa işləyənlər).
 * Sıra: toplam düz cavab → orta faiz → 100% sayı. Sualların yarısından azı cavablanan cəhdlər sayılmır.
 * Hər kəs hər kəsin sətrini görür, amma cavablara yalnız öz cəhdlərindən baxa bilər.
 */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const { id } = await params;

    const pkg = await prisma.testPackage.findUnique({
      where: { id },
      select: {
        id: true, name: true, isBank: true, isPublished: true, deletedAt: true, visibility: true, groupId: true,
        drawEasy: true, drawMedium: true, drawHard: true, isTimed: true, duration: true,
        testPackageGroups: { select: { groupId: true, group: { select: { id: true, name: true } } } },
        topicTests: { select: { topic: { select: { id: true, title: true } } } },
      },
    });
    if (!pkg || pkg.deletedAt) return notFound();

    const groupIds = [...new Set([...pkg.testPackageGroups.map((g) => g.groupId), ...(pkg.groupId ? [pkg.groupId] : [])])];
    const isStaff = me.role === "ADMIN" || (me.role === "TEACHER" && (await teacherOwnsTestPackage(me.id, id)));
    if (!isStaff) {
      if (me.role !== "STUDENT" || !pkg.isPublished) return forbidden();
      if (pkg.visibility === "GROUP_ONLY") {
        const member = await prisma.groupMember.findFirst({ where: { studentId: me.id, groupId: { in: groupIds } }, select: { id: true } });
        if (!member) return forbidden();
      }
    }

    const [members, attempts] = await Promise.all([
      pkg.visibility === "GROUP_ONLY" && groupIds.length
        ? prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { student: { select: { id: true, name: true, photo: true } } } })
        : Promise.resolve([]),
      prisma.studentAttempt.findMany({
        where: { packageId: id, finishedAt: { not: null } },
        select: { studentId: true, score: true, totalScore: true, _count: { select: { answers: true } }, student: { select: { id: true, name: true, photo: true } } },
      }),
    ]);

    type Row = { student: { id: string; name: string; photo: string | null }; attempts: number; totalCorrect: number; sumPct: number; perfect: number };
    const rows = new Map<string, Row>();
    const ensure = (s: Row["student"]) => {
      if (!rows.has(s.id)) rows.set(s.id, { student: s, attempts: 0, totalCorrect: 0, sumPct: 0, perfect: 0 });
      return rows.get(s.id)!;
    };
    for (const m of members) ensure(m.student);
    for (const a of attempts) {
      const r = ensure(a.student);
      if (!countsForRanking(a._count.answers, a.totalScore)) continue;
      const total = a.totalScore ?? 0;
      const score = a.score ?? 0;
      r.attempts++;
      r.totalCorrect += score;
      r.sumPct += total ? (score / total) * 100 : 0;
      if (total && score === total) r.perfect++;
    }

    const list = [...rows.values()].map((r) => ({
      student: r.student,
      attempts: r.attempts,
      totalCorrect: r.totalCorrect,
      perfect: r.perfect,
      avg: r.attempts ? pct1(r.sumPct / r.attempts) : 0,
      mine: r.student.id === me.id,
    }));
    const ranked = rankRows(list, (r) => r.attempts > 0, [(r) => r.totalCorrect, (r) => r.avg, (r) => r.perfect], (r) => r.student.name);

    return NextResponse.json({
      package: {
        id: pkg.id, name: pkg.name, isBank: pkg.isBank, perTest: drawTotal(pkg), isTimed: pkg.isTimed, duration: pkg.duration,
        groups: pkg.testPackageGroups.map((g) => g.group),
        topics: pkg.topicTests.map((t) => t.topic),
      },
      rows: ranked,
      staff: isStaff,
    });
  } catch (error) {
    return serverError(error);
  }
}
