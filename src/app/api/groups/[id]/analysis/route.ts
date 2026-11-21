import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

/** Sütun açarı: mövzu ("t:<id>") və ya mövzuya bağlı olmayan test paketi ("p:<id>") */
type Col = { key: string; title: string; kind: "topic" | "package" };
type Agg = { correct: number; total: number; attempts: number };

/**
 * Müəllim üçün zəif mövzu analizi (qrup üzrə).
 * GET /api/groups/:id/analysis                     — cədvəl: tələbə × mövzu, düzgün faizi
 * GET /api/groups/:id/analysis?studentId=&key=     — bir xana: çətinlik üzrə nəticə, ən çox səhv edilən suallar, cəhdlər
 * Hesab: müəllimin paketlərində qrup üzvlərinin bütün bitmiş cəhdləri; faiz = Σ düz / Σ sual.
 * Paket bir neçə mövzuya bağlıdırsa, hər mövzuda sayılır.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const me = auth.user;
    const { id } = await params;

    const group = await prisma.group.findUnique({
      where: { id },
      select: { id: true, teacherId: true, members: { select: { student: { select: { id: true, name: true, photo: true } } } } },
    });
    if (!group) return notFound("Qrup tapılmadı");
    if (group.teacherId !== me.id && me.role !== "ADMIN") return forbidden();

    const studentIds = group.members.map((m) => m.student.id);
    const owned = {
      OR: [
        { collection: { teacherId: group.teacherId } },
        { group: { teacherId: group.teacherId } },
        { testPackageGroups: { some: { group: { teacherId: group.teacherId } } } },
      ],
    };

    const attempts = studentIds.length
      ? await prisma.studentAttempt.findMany({
          where: { studentId: { in: studentIds }, finishedAt: { not: null }, package: { deletedAt: null, ...owned } },
          select: {
            id: true, studentId: true, score: true, totalScore: true, finishedAt: true,
            package: { select: { id: true, name: true, topicTests: { select: { topic: { select: { id: true, title: true } } } } } },
          },
          orderBy: { finishedAt: "desc" },
        })
      : [];

    const keysOf = (p: (typeof attempts)[number]["package"]) =>
      p.topicTests.length ? p.topicTests.map((t) => `t:${t.topic.id}`) : [`p:${p.id}`];

    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const key = url.searchParams.get("key");

    // ── Bir xananın təfərrüatı ──
    if (studentId && key) {
      if (!studentIds.includes(studentId)) return notFound("Tələbə bu qrupda deyil");
      const mine = attempts.filter((a) => a.studentId === studentId && keysOf(a.package).includes(key));
      const answers = mine.length
        ? await prisma.studentAnswer.findMany({
            where: { attemptId: { in: mine.map((a) => a.id) }, status: { not: "PENDING" } },
            select: { isCorrect: true, question: { select: { id: true, text: true, difficulty: true, package: { select: { name: true } } } } },
          })
        : [];
      const diff: Record<string, { correct: number; answered: number }> = { EASY: { correct: 0, answered: 0 }, MEDIUM: { correct: 0, answered: 0 }, HARD: { correct: 0, answered: 0 }, NONE: { correct: 0, answered: 0 } };
      const wrong = new Map<string, { text: string; packageName: string; wrong: number; seen: number }>();
      for (const a of answers) {
        const d = diff[a.question.difficulty ?? "NONE"];
        d.answered++;
        if (a.isCorrect) d.correct++;
        const w = wrong.get(a.question.id) ?? { text: a.question.text, packageName: a.question.package.name, wrong: 0, seen: 0 };
        w.seen++;
        if (!a.isCorrect) w.wrong++;
        wrong.set(a.question.id, w);
      }
      return NextResponse.json({
        difficulty: diff,
        missed: [...wrong.entries()]
          .filter(([, w]) => w.wrong > 0)
          .sort((x, y) => y[1].wrong - x[1].wrong || y[1].seen - x[1].seen)
          .slice(0, 8)
          .map(([qid, w]) => ({ id: qid, ...w })),
        attempts: mine.map((a) => ({ id: a.id, package: a.package.name, score: a.score ?? 0, total: a.totalScore ?? 0, finishedAt: a.finishedAt })),
      });
    }

    // ── Cədvəl ──
    const cols = new Map<string, Col>();
    const cells = new Map<string, Map<string, Agg>>(); // studentId → key → agg
    for (const a of attempts) {
      for (const t of a.package.topicTests) cols.set(`t:${t.topic.id}`, { key: `t:${t.topic.id}`, title: t.topic.title, kind: "topic" });
      if (!a.package.topicTests.length) cols.set(`p:${a.package.id}`, { key: `p:${a.package.id}`, title: a.package.name, kind: "package" });
      const row = cells.get(a.studentId) ?? new Map<string, Agg>();
      for (const k of keysOf(a.package)) {
        const c = row.get(k) ?? { correct: 0, total: 0, attempts: 0 };
        c.correct += a.score ?? 0;
        c.total += a.totalScore ?? 0;
        c.attempts++;
        row.set(k, c);
      }
      cells.set(a.studentId, row);
    }
    // Mövzular əvvəl (əlifba), sonra mövzusuz paketlər
    const columns = [...cols.values()].sort((x, y) => (x.kind === y.kind ? x.title.localeCompare(y.title, "az") : x.kind === "topic" ? -1 : 1));
    const pct = (c?: Agg) => (c && c.total ? Math.round((c.correct / c.total) * 100) : null);

    const rows = group.members
      .map((m) => {
        const row = cells.get(m.student.id);
        const out: Record<string, { pct: number | null; correct: number; total: number; attempts: number } | null> = {};
        for (const col of columns) {
          const c = row?.get(col.key);
          out[col.key] = c ? { pct: pct(c), ...c } : null;
        }
        const all = row ? [...row.values()].reduce((s, c) => ({ correct: s.correct + c.correct, total: s.total + c.total, attempts: s.attempts + c.attempts }), { correct: 0, total: 0, attempts: 0 }) : null;
        return { student: m.student, cells: out, overall: pct(all ?? undefined) };
      })
      .sort((x, y) => (y.overall ?? -1) - (x.overall ?? -1) || x.student.name.localeCompare(y.student.name, "az"));

    const average: Record<string, number | null> = {};
    for (const col of columns) {
      const list = rows.map((r) => r.cells[col.key]).filter((c): c is NonNullable<typeof c> => !!c);
      const sum = list.reduce((s, c) => ({ correct: s.correct + c.correct, total: s.total + c.total }), { correct: 0, total: 0 });
      average[col.key] = sum.total ? Math.round((sum.correct / sum.total) * 100) : null;
    }

    return NextResponse.json({ columns, rows, average });
  } catch (error) {
    return serverError(error);
  }
}
