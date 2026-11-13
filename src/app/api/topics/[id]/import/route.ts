import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, requireTeacher, serverError } from "@/lib/guards";
import { fileToTopicHtml } from "@/lib/topicImport";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel sorğu limiti ~4.5MB
// DOCX-dəki şəkillər bir-bir Cloudinary-ə yüklənir; vaxt lazım ola bilər
export const maxDuration = 60;

/** Fayldan kitabxana HTML-i hazırlayır (saxlamır): müəllim redaktorda yoxlayıb yadda saxlayır */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const topic = await prisma.topic.findUnique({ where: { id }, select: { teacherId: true } });
    if (!topic) return notFound("Mövzu tapılmadı");
    if (topic.teacherId !== auth.user.id) return forbidden();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fayl seçin" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fayl 4 MB-dan böyük ola bilməz" }, { status: 413 });

    try {
      const r = await fileToTopicHtml(file);
      if (!r.html.replace(/<[^>]*>/g, "").trim() && !r.images) {
        return NextResponse.json({ error: "Faylda mətn tapılmadı" }, { status: 422 });
      }
      return NextResponse.json(r);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Fayl oxunmadı" }, { status: 400 });
    }
  } catch (error) {
    return serverError(error);
  }
}
