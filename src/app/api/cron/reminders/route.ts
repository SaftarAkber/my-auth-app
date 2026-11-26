import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/guards";
import { fmtAz, sendPush } from "@/lib/push";
import { ASSIGNMENT_SELECT, assignmentStudents, countedAttempts } from "@/lib/assignments";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * Aylıq sınaq xatırlatmaları: başlamağa 3 saat və 1 saat 20 dəqiqə qalmış telefon bildirişi.
 * Hər 10 dəqiqədən bir GitHub Actions çağırır (.github/workflows/reminders.yml). Gizli açar lazım deyil:
 * çağırış yalnız vaxtı çatmış xatırlatmaları (hər birini bir dəfə) göndərir, ona görə kənar çağırış zərərsizdir.
 * Gecikmə ola bilər deyə pəncərə geniş götürülür; göndərilib-göndərilmədiyi paketdə qeyd olunur (təkrar getmir).
 */
const STEPS = [
  { field: "remind3hAt", minutes: 180, text: "3 saat sonra başlayır" },
  { field: "remind80At", minutes: 80, text: "1 saat 20 dəqiqə sonra başlayır" },
] as const;

export async function GET(req: NextRequest) {
  try {
    // Hər IP-dən dəqiqədə ən çox 3 çağırış
    const limit = await rateLimit(`cron:${clientIp(req)}`, { windowMs: 60_000, maxRequests: 3 });
    if (!limit.allowed) return NextResponse.json({ error: "Çox tez-tez" }, { status: 429 });

    const now = Date.now();
    const report: { pkg: string; step: string; sent: number }[] = [];
    for (const s of STEPS) {
      // Başlanğıca `minutes` və ya daha az qalıb, amma sınaq hələ başlamayıb (ən sonuncu addımdan daha çox qalıb)
      const nextStep = STEPS.find((x) => x.minutes < s.minutes);
      const pkgs = await prisma.testPackage.findMany({
        where: {
          isMonthly: true, isPublished: true,
          startsAt: { gt: new Date(now + (nextStep ? nextStep.minutes : 0) * 60_000), lte: new Date(now + s.minutes * 60_000) },
          [s.field]: null,
        },
        select: { id: true, name: true, startsAt: true, groupId: true, testPackageGroups: { select: { groupId: true } } },
      });
      for (const p of pkgs) {
        // Əvvəl qeyd edirik ki, paralel çağırışda iki dəfə getməsin
        const claimed = await prisma.testPackage.updateMany({ where: { id: p.id, [s.field]: null }, data: { [s.field]: new Date() } });
        if (!claimed.count) continue;
        const groupIds = [...new Set([...p.testPackageGroups.map((g) => g.groupId), ...(p.groupId ? [p.groupId] : [])])];
        const members = await prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { studentId: true } });
        const sent = await sendPush(members.map((m) => m.studentId), {
          title: `Aylıq sınaq ${s.text}`,
          body: `${p.name} · ${fmtAz(p.startsAt!)}`,
          url: groupIds[0] ? `/student/groups/${groupIds[0]}?tab=tests&pkg=${p.id}` : "/student/my-tests",
          tag: `monthly-${p.id}`,
        });
        report.push({ pkg: p.name, step: s.field, sent });
      }
    }
    // Ev tapşırıqları: son tarixə 1 gün və 3 saat qalmış – yalnız hələ bitirməyənlərə
    const ASTEPS = [
      { field: "remind1dAt", minutes: 1440, text: "1 gün qalıb" },
      { field: "remind3hAt", minutes: 180, text: "3 saat qalıb" },
    ] as const;
    for (const s of ASTEPS) {
      const nextStep = ASTEPS.find((x) => x.minutes < s.minutes);
      const list = await prisma.assignment.findMany({
        where: {
          deadline: { gt: new Date(now + (nextStep ? nextStep.minutes : 0) * 60_000), lte: new Date(now + s.minutes * 60_000) },
          [s.field]: null,
          package: { deletedAt: null },
        },
        select: ASSIGNMENT_SELECT,
      });
      for (const a of list) {
        const claimed = await prisma.assignment.updateMany({ where: { id: a.id, [s.field]: null }, data: { [s.field]: new Date() } });
        if (!claimed.count) continue;
        const students = await assignmentStudents(a);
        const counted = await countedAttempts(a, students.map((x) => x.id));
        const todo = students.filter((x) => (counted.get(x.id)?.length ?? 0) < a.minAttempts).map((x) => x.id);
        const sent = await sendPush(todo, {
          title: `Tapşırıq: ${s.text}`,
          body: `${a.package.name}${a.minAttempts > 1 ? ` – ən azı ${a.minAttempts} dəfə` : ""} · ${fmtAz(a.deadline)}`,
          url: "/student/assignments",
          tag: `assignment-${a.id}`,
        });
        report.push({ pkg: `Tapşırıq: ${a.package.name}`, step: s.field, sent });
      }
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return serverError(error);
  }
}
