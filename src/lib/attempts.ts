import { Prisma, type Difficulty } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { grantTestReward } from "@/lib/rewards";

/**
 * Test cəhdləri: sual bankından təsadüfi seçim, davam edən testin cavablarının saxlanması,
 * vaxt bitəndə avtomatik bitirmə və nəticənin hesablanması.
 */

export const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Asan", MEDIUM: "Orta", HARD: "Çətin" };

/** Vaxt limiti üçün şəbəkə gecikməsinə tolerans (san.) */
export const GRACE_SEC = 30;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type BankPkg = { id: string; drawEasy: number; drawMedium: number; drawHard: number };

export const drawTotal = (p: Pick<BankPkg, "drawEasy" | "drawMedium" | "drawHard">) => p.drawEasy + p.drawMedium + p.drawHard;

/**
 * Bank testi üçün sualları seçir: hər səviyyədən istənilən say.
 * Əvvəlcə tələbənin hələ görmədiyi suallar götürülür, onlar bitəndə həmin səviyyədən təsadüfi.
 * Səviyyədə sual çatmasa, qalan say digər suallardan tamamlanır.
 */
export async function drawBankQuestions(pkg: BankPkg, studentId: string): Promise<string[]> {
  const [questions, past] = await Promise.all([
    prisma.question.findMany({ where: { packageId: pkg.id, isActive: true }, select: { id: true, difficulty: true } }),
    prisma.studentAttempt.findMany({ where: { packageId: pkg.id, studentId }, select: { questionIds: true } }),
  ]);
  const seen = new Set(past.flatMap((p) => p.questionIds));
  const used = new Set<string>();
  const take = (pool: string[], n: number) => {
    if (n <= 0) return [];
    const fresh = shuffle(pool.filter((id) => !seen.has(id) && !used.has(id)));
    const old = shuffle(pool.filter((id) => seen.has(id) && !used.has(id)));
    const out = [...fresh, ...old].slice(0, n);
    out.forEach((id) => used.add(id));
    return out;
  };

  const want: Record<Difficulty, number> = { EASY: pkg.drawEasy, MEDIUM: pkg.drawMedium, HARD: pkg.drawHard };
  const picked: string[] = [];
  for (const d of DIFFICULTIES) picked.push(...take(questions.filter((q) => q.difficulty === d).map((q) => q.id), want[d]));
  const total = drawTotal(pkg);
  if (picked.length < total) picked.push(...take(questions.map((q) => q.id), total - picked.length));
  return picked;
}

type TimedPkg = { isTimed: boolean; duration: number | null };

/** Cəhdin son vaxtı (ms) və ya null (vaxtsız test) */
export const deadlineOf = (startedAt: Date, pkg: TimedPkg) =>
  pkg.isTimed && pkg.duration ? startedAt.getTime() + pkg.duration * 1000 : null;

/** Vaxt (tolerans daxil) bitibmi */
export const isExpired = (startedAt: Date, pkg: TimedPkg, now = Date.now()) => {
  const d = deadlineOf(startedAt, pkg);
  return d !== null && now > d + GRACE_SEC * 1000;
};

export const draftOf = (v: Prisma.JsonValue | null | undefined): Record<string, string> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === "string") out[k] = x;
  return out;
};

/** Cəhdin sualları: bankda seçilmiş suallar (sıra ilə), adi testdə paketin aktiv sualları */
export async function attemptQuestions(attempt: { packageId: string; questionIds: string[] }) {
  const select = { id: true, type: true, correctAnswer: true } as const;
  if (attempt.questionIds.length) {
    const rows = await prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, select });
    const byId = new Map(rows.map((q) => [q.id, q]));
    return attempt.questionIds.flatMap((id) => byId.get(id) ?? []);
  }
  return prisma.question.findMany({ where: { packageId: attempt.packageId, isActive: true }, orderBy: { order: "asc" }, select });
}

export interface FinishResult {
  attempt: { id: string; score: number | null; totalScore: number | null; finishedAt: Date | null };
  coinsEarned: number;
  rewardPending: boolean;
}

/**
 * Cəhdi bitirir: saxlanmış cavablar + göndərilən cavablar yoxlanılır, bal yazılır, mükafat verilir.
 * `incoming` null olarsa yalnız saxlanmış cavablar götürülür (məs. vaxt bitib).
 * Cəhd artıq bitibsə null qaytarır.
 */
export async function finishAttempt(attemptId: string, incoming: Record<string, string> | null): Promise<FinishResult | null> {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: { package: { select: { id: true, isTimed: true, duration: true, rewardEnabled: true, rewardAuto: true } } },
  });
  if (!attempt || attempt.finishedAt) return null;

  const questions = await attemptQuestions(attempt);
  const merged = { ...draftOf(attempt.draft), ...(incoming ?? {}) };

  let correct = 0;
  const answerData = questions.flatMap((q) => {
    const a = merged[q.id];
    if (typeof a !== "string" || !a.trim()) return [];
    let isCorrect: boolean | null = null;
    let status: "APPROVED" | "PENDING" = "PENDING";
    if (q.type === "MULTIPLE_CHOICE") {
      isCorrect = q.correctAnswer === a;
      if (isCorrect) correct++;
      status = "APPROVED";
    }
    return [{ attemptId, questionId: q.id, answer: a.slice(0, 5000), isCorrect, status }];
  });

  // Vaxt bitibsə, bitmə anı son vaxt kimi yazılır
  const deadline = deadlineOf(attempt.startedAt, attempt.package);
  const finishedAt = new Date(deadline ? Math.min(Date.now(), deadline) : Date.now());

  const updated = await prisma.$transaction(async (tx) => {
    const closed = await tx.studentAttempt.updateMany({
      where: { id: attemptId, finishedAt: null },
      data: { finishedAt, score: correct, totalScore: questions.length, draft: Prisma.DbNull },
    });
    if (closed.count === 0) return null;
    if (answerData.length) await tx.studentAnswer.createMany({ data: answerData, skipDuplicates: true });
    return tx.studentAttempt.findUnique({ where: { id: attemptId }, select: { id: true, score: true, totalScore: true, finishedAt: true } });
  });
  if (!updated) return null;

  // Mükafat: açıq cavab yoxdursa və avtomatik rejimdədirsə
  let coinsEarned = 0;
  let rewardPending = false;
  const hasOpen = questions.some((q) => q.type === "OPEN_ENDED");
  if (attempt.package.rewardEnabled && attempt.package.rewardAuto && !hasOpen) {
    try {
      const r = await grantTestReward(attemptId);
      if (r.status === "granted") coinsEarned = r.coins;
      if (r.status === "insufficient") rewardPending = true;
    } catch (e) {
      console.error("Mükafat xətası:", e);
    }
  }
  return { attempt: updated, coinsEarned, rewardPending };
}

/** Vaxtı bitmiş, açıq qalmış cəhdləri bağlayır (tələbə qayıtmayıbsa) */
export async function closeExpiredAttempts(where: Prisma.StudentAttemptWhereInput) {
  const open = await prisma.studentAttempt.findMany({
    where: { ...where, finishedAt: null, package: { isTimed: true } },
    select: { id: true, startedAt: true, package: { select: { isTimed: true, duration: true } } },
    take: 200,
  });
  for (const a of open) if (isExpired(a.startedAt, a.package)) await finishAttempt(a.id, null);
}

/** Reytinqə düşən cəhd: sualların ən azı yarısı cavablanıb */
export const countsForRanking = (answered: number, total: number | null) => !!total && answered * 2 >= total;
