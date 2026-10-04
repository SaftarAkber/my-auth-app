import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const unauthorized = () =>
  NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
export const forbidden = () =>
  NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
export const notFound = (msg = "Tapılmadı") =>
  NextResponse.json({ error: msg }, { status: 404 });
export const serverError = (error: unknown) => {
  console.error(error);
  return NextResponse.json({ error: "Server xətası" }, { status: 500 });
};

/** Giriş etmiş istifadəçi və ya `null`. Token pozulubsa da xəta atmır. */
export async function optionalUser(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/** Müəllim üçün guard: istifadəçi və ya hazır cavab (Response) qaytarır. */
export async function requireTeacher(): Promise<
  { user: CurrentUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (user.role !== "TEACHER") return { response: forbidden() };
  return { user };
}

export async function requireStudent(): Promise<
  { user: CurrentUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  if (user.role !== "STUDENT") return { response: forbidden() };
  return { user };
}

/** Test paketinin sahibi: koleksiyonun və ya qrupun müəllimi, ya da paket bağlı olduğu qrupların müəllimi. */
export async function teacherOwnsTestPackage(teacherId: string, packageId: string) {
  const pkg = await prisma.testPackage.findFirst({
    where: {
      id: packageId,
      OR: [
        { collection: { teacherId } },
        { group: { teacherId } },
        { testPackageGroups: { some: { group: { teacherId } } } },
      ],
    },
    select: { id: true },
  });
  return !!pkg;
}

export async function teacherOwnsVideoPackage(teacherId: string, packageId: string) {
  const pkg = await prisma.videoPackage.findFirst({
    where: {
      id: packageId,
      OR: [
        { teacherId },
        { collection: { teacherId } },
        { group: { teacherId } },
        { videoPackageGroups: { some: { group: { teacherId } } } },
        // Heç bir sahibi olmayan (köhnə) paketlər
        { teacherId: null, collectionId: null, groupId: null, videoPackageGroups: { none: {} } },
      ],
    },
    select: { id: true },
  });
  return !!pkg;
}

export async function teacherOwnsGroup(teacherId: string, groupId: string) {
  const g = await prisma.group.findFirst({
    where: { id: groupId, teacherId },
    select: { id: true },
  });
  return !!g;
}

/** Bütün verilən qrupların bu müəllimə aid olduğunu yoxlayır. */
export async function teacherOwnsGroups(teacherId: string, groupIds: string[]) {
  if (!groupIds.length) return true;
  const count = await prisma.group.count({
    where: { id: { in: groupIds }, teacherId },
  });
  return count === new Set(groupIds).size;
}
