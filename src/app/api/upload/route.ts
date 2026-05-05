import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "image";

    // ✅ Sadece resim kabul et
    if (type === "video") {
      return NextResponse.json({ error: "Video yükləmə dəstəklənmir" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Fayl seçilməyib" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Şəkil maksimum 5MB ola bilər" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: "eduflow/images",
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Upload xətası:", error);
    return NextResponse.json({ error: "Yükləmə xətası" }, { status: 500 });
  }
}