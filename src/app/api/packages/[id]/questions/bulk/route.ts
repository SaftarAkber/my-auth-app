import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

type In = { text?: unknown; type?: unknown; options?: unknown; correctAnswer?: unknown };

// Təsdiqlənmiş sualları bir əməliyyatda əlavə edir
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id: packageId } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, packageId))) return forbidden();

    const { questions } = await req.json();
    if (!Array.isArray(questions) || questions.length === 0 || questions.length > 200) {
      return NextResponse.json({ error: "1–200 sual göndərin" }, { status: 400 });
    }

    const rows: { text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | undefined; correctAnswer: string | null }[] = [];
    for (const [i, q] of (questions as In[]).entries()) {
      const text = typeof q.text === "string" ? q.text.trim() : "";
      if (!text) return NextResponse.json({ error: `${i + 1}-ci sualın mətni boşdur` }, { status: 400 });
      if (q.type === "OPEN_ENDED") {
        rows.push({ text, type: "OPEN_ENDED", options: undefined, correctAnswer: null });
        continue;
      }
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
      if (options.length < 2 || options.length > 5) {
        return NextResponse.json({ error: `${i + 1}-ci sual: 2–5 variant olmalıdır` }, { status: 400 });
      }
      if (typeof q.correctAnswer !== "string" || !options.includes(q.correctAnswer)) {
        return NextResponse.json({ error: `${i + 1}-ci sual: düzgün cavab seçilməyib` }, { status: 400 });
      }
      rows.push({ text, type: "MULTIPLE_CHOICE", options, correctAnswer: q.correctAnswer });
    }

    const last = await prisma.question.aggregate({ where: { packageId }, _max: { order: true } });
    const start = (last._max.order ?? -1) + 1;
    await prisma.question.createMany({
      data: rows.map((r, i) => ({ ...r, order: start + i, packageId })),
    });
    return NextResponse.json({ created: rows.length }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
