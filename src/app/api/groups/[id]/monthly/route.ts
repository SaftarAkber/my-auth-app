import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/guards";
import { pct1 } from "@/lib/ranking";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Aylıq sınaq yarış cədvəli: qrupa açıq "Aylıq sınaq" paketləri və bu paketlərin açıq olduğu
 * bütün qrupların tələbələri bir siyahıda. Hər paketdə tələbənin İLK bitmiş cəhdi sayılır
 * (sonrakılar məşqdir). Sıralama brauzerdə: toplam düz → 1-ci yer sayı → orta faiz.
 */
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const me = await getCurrentUser();
    if (!me) return unauthorized();
    const { id } = await params;

    const group = await prisma.group.findUnique({ where: { id }, select: { id: true, teacherId: true } });
    if (!group) return notFound("Qrup tapılmadı");
    const staff = me.role === "ADMIN" || me.id === group.teacherId;
    if (!staff) {
      const member = await prisma.groupMember.findFirst({ where: { groupId: id, studentId: me.id }, select: { id: true } });
      if (!member) return forbidden();
    }

    const pkgs = await prisma.testPackage.findMany({
      where: {
        isMonthly: true, isPublished: true, deletedAt: null,
        OR: [{ groupId: id }, { testPackageGroups: { some: { groupId: id } } }],
      },
      select: {
        id: true, name: true, createdAt: true, startsAt: true, groupId: true,
        testPackageGroups: { select: { groupId: true } },
        _count: { select: { questions: { where: { isActive: true } } } },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    });
    if (pkgs.length === 0) return NextResponse.json({ packages: [], groups: [], rows: [], staff });

    // Paketlərin açıq olduğu qruplar (yalnız bu müəllimin qrupları)
    const pkgGroups = new Map(pkgs.map((p) => [p.id, new Set([...p.testPackageGroups.map((g) => g.groupId), ...(p.groupId ? [p.groupId] : [])])]));
    const allGroupIds = [...new Set(pkgs.flatMap((p) => [...pkgGroups.get(p.id)!]))];
    const groups = await prisma.group.findMany({
      where: { id: { in: allGroupIds }, teacherId: group.teacherId },
      select: { id: true, name: true, members: { select: { student: { select: { id: true, name: true, photo: true } } } } },
      orderBy: { createdAt: "asc" },
    });

    const students = new Map<string, { id: string; name: string; photo: string | null; groupIds: string[] }>();
    for (const g of groups) {
      for (const m of g.members) {
        const s = students.get(m.student.id) ?? { ...m.student, groupIds: [] };
        s.groupIds.push(g.id);
        students.set(m.student.id, s);
      }
    }

    const attempts = await prisma.studentAttempt.findMany({
      where: { packageId: { in: pkgs.map((p) => p.id) }, studentId: { in: [...students.keys()] }, finishedAt: { not: null } },
      select: { id: true, packageId: true, studentId: true, score: true, totalScore: true, startedAt: true },
      orderBy: { startedAt: "asc" },
    });
    // İlk cəhd: tələbə + paket üzrə ən erkən başlanan
    const first = new Map<string, (typeof attempts)[number]>();
    const extra = new Map<string, number>();
    for (const a of attempts) {
      const k = `${a.studentId}:${a.packageId}`;
      if (!first.has(k)) first.set(k, a);
      else extra.set(k, (extra.get(k) ?? 0) + 1);
    }

    // Hər sınaqda ən yüksək nəticə: bərabər olanların hamısına "1-ci yer"
    const best = new Map<string, number>();
    for (const a of first.values()) best.set(a.packageId, Math.max(best.get(a.packageId) ?? 0, a.score ?? 0));

    const rows = [...students.values()].map((s) => {
      let total = 0;
      let taken = 0;
      let sumPct = 0;
      let firsts = 0;
      const cells: Record<string, { score: number; total: number; attemptId: string | null; practice: number } | null> = {};
      for (const p of pkgs) {
        const a = first.get(`${s.id}:${p.id}`);
        if (!a) {
          cells[p.id] = null;
          continue;
        }
        const score = a.score ?? 0;
        const tot = a.totalScore ?? p._count.questions;
        total += score;
        taken++;
        sumPct += tot ? (score / tot) * 100 : 0;
        if (score > 0 && score === best.get(p.id)) firsts++;
        // Başqalarının cavablarına yalnız müəllim (və tələbə özü) baxa bilər
        const open = staff || s.id === me.id;
        cells[p.id] = { score, total: tot, attemptId: open ? a.id : null, practice: open ? extra.get(`${s.id}:${p.id}`) ?? 0 : 0 };
      }
      return {
        student: { id: s.id, name: s.name, photo: s.photo },
        groupIds: s.groupIds,
        cells,
        total,
        taken,
        firsts,
        avg: taken ? pct1(sumPct / taken) : 0,
        mine: s.id === me.id,
      };
    });

    return NextResponse.json({
      packages: pkgs.map((p) => ({ id: p.id, name: p.name, total: p._count.questions })),
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
      rows,
      staff,
    });
  } catch (error) {
    return serverError(error);
  }
}
