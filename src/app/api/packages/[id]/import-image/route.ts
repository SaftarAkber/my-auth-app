import { NextRequest, NextResponse } from "next/server";
import { forbidden, requireTeacher, serverError, teacherOwnsTestPackage } from "@/lib/guards";

// Şəkli oxumaq bir neçə saniyə çəkir
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel sorğu limiti ~4.5MB (brauzer şəkli əvvəlcədən kiçildir)
const MODEL = "claude-sonnet-5-5";
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PROMPT = `Bu şəkildə test sualları var (çap və ya əl yazısı ola bilər). Bütün sualları şəkildəki sıra ilə çıxar.
Yalnız bu JSON formatında cavab ver, başqa heç nə yazma:
{"questions":[{"text":"sual mətni","options":["variant 1","variant 2"],"correct":0}]}

Qaydalar:
- Mətni olduğu kimi, şəkildəki dildə yaz. Düzəliş etmə, heç nə uydurma. Oxuna bilməyən hissəni yaxın variantla yaz, amma sualı atma.
- "options" variantların mətnləridir (A), B) kimi hərfləri və nömrələri çıxar). Ən çoxu 5 variant.
- "correct" düzgün variantın indeksidir (A=0, B=1...). Düzgün cavab dairəyə alınıbsa, altından xətt çəkilibsə, işarələnibsə, ulduzlanıbsa, doldurulubsa və ya "Cavab: B" yazılıbsa onu seç. Heç bir işarə yoxdursa -1 yaz.
- Variantı olmayan (açıq) sual üçün "options" boş massiv, "correct" -1 olsun.
- Sual nömrələrini mətnə daxil etmə.`;

interface Raw { text?: unknown; options?: unknown; correct?: unknown }

interface Out { text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[]; correct: number }

function sanitize(raw: Raw[]): Out[] {
  return raw.flatMap((q): Out[] => {
    const text = typeof q.text === "string" ? q.text.trim() : "";
    if (!text) return [];
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 5) : [];
    if (options.length < 2) return [{ text, type: "OPEN_ENDED" as const, options: [] as string[], correct: -1 }];
    const c = typeof q.correct === "number" ? Math.trunc(q.correct) : -1;
    return [{ text, type: "MULTIPLE_CHOICE" as const, options, correct: c >= 0 && c < options.length ? c : -1 }];
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    if (!(await teacherOwnsTestPackage(auth.user.id, id))) return forbidden();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Şəkildən oxuma hələ qoşulmayıb (ANTHROPIC_API_KEY təyin olunmayıb)" }, { status: 503 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Şəkil seçin" }, { status: 400 });
    if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Yalnız JPG, PNG, WEBP şəkilləri qəbul olunur" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Şəkil çox böyükdür" }, { status: 413 });

    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type, data } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    if (!res.ok) {
      console.error("Şəkil oxuma xətası:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Şəkil oxunmadı, bir az sonra yenidən cəhd edin" }, { status: 502 });
    }
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((c) => c.type === "text")?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    let parsed: { questions?: Raw[] } = {};
    try {
      parsed = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: "Şəkildəki suallar tanınmadı, daha aydın şəkil çəkin" }, { status: 422 });
    }
    const questions = sanitize(Array.isArray(parsed.questions) ? parsed.questions : []);
    if (questions.length === 0) return NextResponse.json({ error: "Şəkildə sual tapılmadı" }, { status: 422 });
    return NextResponse.json({ questions });
  } catch (error) {
    return serverError(error);
  }
}
