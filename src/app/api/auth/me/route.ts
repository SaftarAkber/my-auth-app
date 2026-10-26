import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanSubjects } from "@/lib/subjects";

const SELECT = {
  id: true, name: true, phone: true, email: true, role: true,
  bio: true, photo: true, coverPhoto: true, coinBalance: true, subjects: true, createdAt: true,
} as const;

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: currentUser.id }, select: SELECT });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { name, bio, photo, coverPhoto, subjects } = await req.json();
    const cleaned = subjects !== undefined && currentUser.role === "TEACHER" ? cleanSubjects(subjects) : undefined;
    if (cleaned && cleaned.length === 0) {
      return NextResponse.json({ error: "Ən azı 1 fənn seçin (ən çoxu 2)" }, { status: 400 });
    }
    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Ad boş ola bilməz" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(bio !== undefined && { bio }),
        ...(photo !== undefined && { photo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(cleaned && { subjects: cleaned }),
      },
      select: SELECT,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profil yeniləmə xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
