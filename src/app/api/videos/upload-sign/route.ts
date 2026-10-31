import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, serverError } from "@/lib/guards";
import { VIDEO_FORMATS, VIDEO_MAX_MB, VIDEO_QUOTA_MB, signVideoUpload, usedBytes } from "@/lib/videoUpload";

// Müəllimin birbaşa Cloudinary-yə video yükləməsi üçün imza. Ölçü və yer limiti burada əvvəlcədən yoxlanılır.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Video yükləmə hələ qoşulmayıb" }, { status: 503 });
    }

    const { size, name } = await req.json();
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0) return NextResponse.json({ error: "Fayl seçilməyib" }, { status: 400 });

    const ext = String(name ?? "").split(".").pop()?.toLowerCase() ?? "";
    if (ext && !VIDEO_FORMATS.includes(ext)) {
      return NextResponse.json({ error: `Dəstəklənən formatlar: ${VIDEO_FORMATS.join(", ").toUpperCase()}` }, { status: 400 });
    }
    if (bytes > VIDEO_MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Video ${VIDEO_MAX_MB} MB-dan böyük ola bilməz` }, { status: 413 });
    }
    const used = await usedBytes(auth.user.id);
    if (used + bytes > VIDEO_QUOTA_MB * 1024 * 1024) {
      const left = Math.max(0, Math.floor((VIDEO_QUOTA_MB * 1024 * 1024 - used) / (1024 * 1024)));
      return NextResponse.json({ error: `Yer limitiniz çatmır (qalıb: ${left} MB). Köhnə videoları silin` }, { status: 413 });
    }

    return NextResponse.json({ sign: signVideoUpload(auth.user.id), maxMb: VIDEO_MAX_MB });
  } catch (error) {
    return serverError(error);
  }
}
