import { prisma } from "@/lib/prisma";
import { InsufficientCoins, transferCoins } from "@/lib/coins";

/** Testin sahibi olan müəllim: kolleksiya, qrup və ya bağlı qrupların müəllimi. */
export async function ownerTeacherId(packageId: string): Promise<string | null> {
  const pkg = await prisma.testPackage.findUnique({
    where: { id: packageId },
    select: {
      collection: { select: { teacherId: true } },
      group: { select: { teacherId: true } },
      testPackageGroups: { select: { group: { select: { teacherId: true } } }, take: 1 },
    },
  });
  return (
    pkg?.collection?.teacherId ??
    pkg?.group?.teacherId ??
    pkg?.testPackageGroups[0]?.group.teacherId ??
    null
  );
}

export type RewardResult =
  | { status: "granted"; coins: number }
  | { status: "not-eligible" }
  | { status: "already" }
  | { status: "insufficient" };

/** Cəhd mükafat qaydasını ödəyirmi (açıq cavabların yoxlanması gözlənilmirsə). */
export async function isEligible(attemptId: string) {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: { package: true, answers: { select: { status: true } } },
  });
  if (!attempt || !attempt.finishedAt) return false;
  const pkg = attempt.package;
  if (!pkg.rewardEnabled || !pkg.rewardCoins || pkg.rewardMinCorrect == null) return false;
  return (attempt.score ?? 0) >= pkg.rewardMinCorrect;
}

/**
 * Qayda ödənibsə, müəllimdən tələbəyə mükafat köçürür.
 * Hər cəhd və hər tələbə-test cütü yalnız bir dəfə mükafatlandırılır.
 */
export async function grantTestReward(attemptId: string): Promise<RewardResult> {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    include: { package: true },
  });
  if (!attempt || !attempt.finishedAt) return { status: "not-eligible" };
  if (attempt.rewardGranted) return { status: "already" };

  const pkg = attempt.package;
  if (!pkg.rewardEnabled || !pkg.rewardCoins || pkg.rewardMinCorrect == null) return { status: "not-eligible" };
  if ((attempt.score ?? 0) < pkg.rewardMinCorrect) return { status: "not-eligible" };

  const earlier = await prisma.studentAttempt.count({
    where: { studentId: attempt.studentId, packageId: pkg.id, rewardGranted: true },
  });
  if (earlier > 0) return { status: "already" };

  const teacherId = await ownerTeacherId(pkg.id);
  if (!teacherId) return { status: "not-eligible" };

  const coins = pkg.rewardCoins;
  try {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.studentAttempt.updateMany({
        where: { id: attempt.id, rewardGranted: false },
        data: { rewardGranted: true, rewardCoins: coins },
      });
      if (marked.count === 0) return;
      await transferCoins({
        fromId: teacherId,
        toId: attempt.studentId,
        amount: coins,
        reason: `${pkg.name}: ${attempt.score}/${attempt.totalScore ?? "?"}`,
        receivedType: "TEST_REWARD",
        tx,
      });
    });
    return { status: "granted", coins };
  } catch (e) {
    if (e instanceof InsufficientCoins) return { status: "insufficient" };
    throw e;
  }
}

/** Coin mükafatı qaydası (istəyə bağlı): sual sayı və məbləğ yoxlanılır. */
export function rewardData(b: Record<string, unknown>) {
  if (b.rewardEnabled === undefined) return {};
  if (!b.rewardEnabled) return { rewardEnabled: false };
  const min = Math.floor(Number(b.rewardMinCorrect));
  const coins = Math.floor(Number(b.rewardCoins));
  return {
    rewardEnabled: true,
    rewardMinCorrect: Number.isFinite(min) && min >= 1 ? min : 1,
    rewardCoins: Number.isFinite(coins) && coins >= 1 ? Math.min(coins, 100000) : 1,
    rewardAuto: b.rewardAuto !== false,
  };
}
