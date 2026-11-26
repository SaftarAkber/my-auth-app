import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsGroup } from "@/lib/guards";
import { ASSIGNMENT_SELECT, assignmentStudents, countedAttempts, statusOf } from "@/lib/assignments";
import { cleanAssignmentInput } from "@/lib/assignmentInput";
import { fmtAz, later, sendPush } from "@/lib/push";

/**
 * GET /api/assignments?groupId= — müəllim: qrupun tapşırıqları və hər tələbənin irəliləyişi (yalnız bu qrupun tələbələri)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const groupId = req.nextUrl.searchParams.get("groupId") ?? "";
    if (!groupId || !(await teacherOwnsGroup(auth.user.id, groupId))) return forbidden();

    const list = await prisma.assignment.findMany({
      where: { groups: { some: { groupId } }, package: { deletedAt: null } },
      select: ASSIGNMENT_SELECT,
      orderBy: { deadline: "desc" },
    });
    const now = Date.now();
    const out = [];
    for (const a of list) {
      const students = (await assignmentStudents(a)).filter((s) => s.groupIds.includes(groupId));
      const counted = await countedAttempts(a, students.map((s) => s.id));
      const rows = students
        .map((s) => {
          const n = counted.get(s.id)?.length ?? 0;
          return { student: { id: s.id, name: s.name, photo: s.photo }, count: n, status: statusOf(n, a.minAttempts, a.deadline, now) };
        })
        .sort((x, y) => Number(x.status === "done") - Number(y.status === "done") || x.student.name.localeCompare(y.student.name, "az"));
      const exempt = await prisma.groupMember.findMany({
        where: { groupId, studentId: { in: a.exempts.map((e) => e.studentId) } },
        select: { student: { select: { id: true, name: true } } },
      });
      out.push({
        ...a,
        rows,
        exempted: exempt.map((e) => e.student),
        done: rows.filter((r) => r.status === "done").length,
        active: a.deadline.getTime() >= now,
      });
    }
    // Aktivlər əvvəl (ən yaxın son tarix birinci), sonra bitmişlər (ən sonuncu birinci)
    out.sort((x, y) => Number(y.active) - Number(x.active) || (x.active ? +x.deadline - +y.deadline : +y.deadline - +x.deadline));
    return NextResponse.json({ assignments: out });
  } catch (error) {
    return serverError(error);
  }
}

/** POST — yeni tapşırıq; tələbələrə telefon bildirişi */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const c = await cleanAssignmentInput(await req.json().catch(() => ({})), auth.user.id);
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const d = c.data;
    if (d.deadline!.getTime() <= Date.now()) return NextResponse.json({ error: "Son tarix gələcəkdə olmalıdır" }, { status: 400 });

    const a = await prisma.assignment.create({
      data: {
        teacherId: auth.user.id,
        packageId: d.packageId!,
        minAttempts: d.minAttempts!,
        deadline: d.deadline!,
        coinReward: d.coinReward ?? null,
        note: d.note ?? null,
        groups: { create: d.groups!.map((g) => ({ groupId: g.groupId })) },
        exempts: { create: [...new Set(d.groups!.flatMap((g) => g.exempt))].map((studentId) => ({ studentId })) },
      },
      select: ASSIGNMENT_SELECT,
    });
    later(async () => {
      const students = await assignmentStudents(a);
      await sendPush(students.map((s) => s.id), {
        title: "Yeni tapşırıq",
        body: `${a.package.name}${a.minAttempts > 1 ? ` – ən azı ${a.minAttempts} dəfə` : ""} · son tarix ${fmtAz(a.deadline)}`,
        url: "/student/assignments",
        tag: `assignment-${a.id}`,
      });
    });
    return NextResponse.json({ assignment: a }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
