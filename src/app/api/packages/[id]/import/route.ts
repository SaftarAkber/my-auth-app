import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";
import { extractText, parseQuiz } from "@/lib/quizImport";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel sorğu limiti ~4.5MB

// Fayldan sualları oxuyur (saxlamır): müəllim yoxlayıb təsdiq etdikdən sonra bulk ilə yazılır
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fayl seçin" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fayl 4 MB-dan böyük ola bilməz" }, { status: 413 });

    let text: string;
    try {
      text = await extractText(file);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Fayl oxunmadı" }, { status: 400 });
    }
    const questions = parseQuiz(text);
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Fayldan sual tapılmadı. Suallar \"1.\" kimi nömrələnməli, variantlar \"A)\" ilə başlamalıdır. Skan edilmiş şəkil PDF-ləri oxunmur." },
        { status: 422 },
      );
    }
    return NextResponse.json({ questions: questions.slice(0, 200) });
  } catch (error) {
    return serverError(error);
  }
}
