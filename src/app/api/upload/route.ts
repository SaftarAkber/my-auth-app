import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string || "image";

    if (!file) {
      return NextResponse.json({ error: "Fayl seçilməyib" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: type === "video" ? "video" : "image",
      folder: "eduflow",
      ...(type === "video" && {
        eager: [{ streaming_profile: "full_hd", format: "m3u8" }],
        eager_async: true,
      }),
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