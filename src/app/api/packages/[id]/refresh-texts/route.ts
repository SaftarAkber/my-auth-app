import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText, parseQuiz } from "@/lib/quizImport";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

// Böyük bankda (1000+ sual) yeniləmə və təmizləmə bir neçə saniyə çəkə bilər
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
/** Mətnin "skeleti": boşluqlar və sətir keçidləri atılır – yalnız düzülüşü fərqli olan mətnlər eyni sayılır */
const skeleton = (s: string) => s.replace(/\s+/g, "");

/**
 * "Mətnləri fayldan yenilə": paketin mövcud suallarının mətni fayldakı düzülüşlə (sətir keçidləri) yenilənir.
 * Yeni sual yaranmır, cəhdlər və nəticələr qalır, şəkillər yenidən yüklənmir.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fayl seçin" }, { status: 400 });
    if (!/\.(docx|txt)$/i.test(file.name)) return NextResponse.json({ error: "DOCX və ya TXT faylı seçin" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fayl 4 MB-dan böyük ola bilməz" }, { status: 413 });

    const parsed = parseQuiz(await extractText(file), { keepLines: true });
    if (!parsed.length) return NextResponse.json({ error: "Fayldan sual tapılmadı" }, { status: 422 });

    const byKey = new Map<string, string>();
    for (const q of parsed) {
      const k = skeleton(q.text);
      if (k && !byKey.has(k)) byKey.set(k, q.text);
    }
    const existing = await prisma.question.findMany({
      where: { packageId: id, archivedAt: null },
      select: { id: true, text: true },
    });
    const changes = existing
      .map((q) => ({ id: q.id, old: q.text, next: byKey.get(skeleton(q.text)) }))
      .filter((c): c is { id: string; old: string; next: string } => !!c.next && c.next !== c.old);
    const matched = existing.filter((q) => byKey.has(skeleton(q.text))).length;

    for (let i = 0; i < changes.length; i += 100) {
      await prisma.$transaction(changes.slice(i, i + 100).map((c) => prisma.question.update({ where: { id: c.id }, data: { text: c.next } })));
    }

    return NextResponse.json({ total: existing.length, matched, updated: changes.length, unmatched: existing.length - matched });
  } catch (error) {
    return serverError(error);
  }
}
