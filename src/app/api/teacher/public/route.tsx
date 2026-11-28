import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cleanSubjects } from "@/lib/subjects";

/** Tələbə sayının göstərilməsi: 10-a qədər dəqiq, sonra onluğa aşağı yuvarlaq + "+" (127 → "120+") */
function studentCountLabel(n: number) {
  return n < 10 ? String(n) : `${Math.floor(n / 10) * 10}+`;
}

/**
 * GET /api/teacher/public — müəllimlər (kartlar üçün)
 *   ?mine=1          yalnız tələbənin öz qruplarının müəllimləri
 *   ?subjects=it,math ən çoxu 2 fənn (hər hansı biri uyğun gəlsin)
 *   ?minStudents=50  tələbə sayı ən azı (sayını gizlədənlər bu filtrdə görünmür)
 *   ?minExp=3        təcrübə ən azı (il)
 *   ?live=1          canlı onlayn dərs keçirənlər
 * Tələbə sayı yalnız müəllim icazə veribsə göndərilir ("120+" kimi); dəqiq rəqəm heç vaxt göndərilmir.
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
    }
    const sp = req.nextUrl.searchParams;
    const subjects = cleanSubjects((sp.get("subjects") ?? "").split(",").filter(Boolean));
    const minStudents = Math.max(0, Number(sp.get("minStudents")) || 0);
    const minExp = Math.max(0, Number(sp.get("minExp")) || 0);
    const live = sp.get("live") === "1";
    const mine = sp.get("mine") === "1";

    let mineIds: string[] | undefined;
    if (mine) {
      const rows = await prisma.groupMember.findMany({
        where: { studentId: currentUser.id },
        select: { group: { select: { teacherId: true } } },
      });
      mineIds = [...new Set(rows.map((r) => r.group.teacherId))];
    }

    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        deletedAt: null,
        ...(mineIds && { id: { in: mineIds } }),
        ...(subjects.length && { subjects: { hasSome: subjects } }),
        ...(minExp > 0 && { experienceYears: { gte: minExp } }),
        ...(live && { liveOnline: true }),
        ...(minStudents > 0 && { showStudentCount: true }),
      },
      select: {
        id: true,
        name: true,
        bio: true,
        photo: true,
        coverPhoto: true,
        subjects: true,
        experienceYears: true,
        liveOnline: true,
        showStudentCount: true,
        _count: { select: { groups: true } },
      },
      orderBy: { name: "asc" },
    });

    // Hər müəllimin fərqli tələbə sayı (silinmiş hesablar sayılmır)
    const members = teachers.length
      ? await prisma.groupMember.findMany({
          where: { group: { teacherId: { in: teachers.map((t) => t.id) } }, student: { deletedAt: null } },
          select: { studentId: true, group: { select: { teacherId: true } } },
        })
      : [];
    const sets = new Map<string, Set<string>>();
    for (const m of members) {
      const s = sets.get(m.group.teacherId) ?? new Set<string>();
      s.add(m.studentId);
      sets.set(m.group.teacherId, s);
    }

    const count = (id: string) => sets.get(id)?.size ?? 0;
    const list = teachers
      .filter((t) => minStudents <= 0 || count(t.id) >= minStudents)
      // 0 heç vaxt göstərilmir (yeni müəllim və ya gizlədilmiş say)
      .map(({ showStudentCount, ...t }) => ({ ...t, students: showStudentCount && count(t.id) > 0 ? studentCountLabel(count(t.id)) : null }));

    return NextResponse.json({
      teachers: list,
      teacher: list[0] ?? null, // köhnə tək-müəllim dəstəyi
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server xətası" }, { status: 500 });
  }
}
