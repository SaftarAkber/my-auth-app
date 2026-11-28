import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanSubjects } from "@/lib/subjects";

const SELECT = {
  id: true, name: true, phone: true, email: true, role: true,
  bio: true, photo: true, coverPhoto: true, coinBalance: true, subjects: true, createdAt: true,
  experienceYears: true, liveOnline: true, showStudentCount: true,
} as const;

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: currentUser.id }, select: SELECT });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
    }

    const { name, bio, photo, coverPhoto, subjects, experienceYears, liveOnline, showStudentCount } = await req.json();
    const teacher = currentUser.role === "TEACHER";
    // Təcrübə ili: 0–60 tam ədəd; boş = göstərilmir
    const exp = experienceYears === undefined ? undefined : experienceYears === null || experienceYears === "" ? null : Math.max(0, Math.min(60, Math.round(Number(experienceYears)) || 0));
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
        ...(bio !== undefined && { bio: String(bio).split("\n").slice(0, 4).join("\n").slice(0, 240) }),
        ...(photo !== undefined && { photo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(cleaned && { subjects: cleaned }),
        ...(teacher && exp !== undefined && { experienceYears: exp }),
        ...(teacher && typeof liveOnline === "boolean" && { liveOnline }),
        ...(teacher && typeof showStudentCount === "boolean" && { showStudentCount }),
      },
      select: SELECT,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profil yeniləmə xətası:", error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
