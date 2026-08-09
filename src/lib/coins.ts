import { prisma } from "@/lib/prisma";
import { CoinTransactionType } from "@prisma/client";

export async function adjustCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  reason?: string
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const newBalance = user.coinBalance + amount;
    if (newBalance < 0) throw new Error("Kifayət qədər coin yoxdur");

    const updated = await tx.user.update({
      where: { id: userId },
      data: { coinBalance: newBalance },
    });

    await tx.coinTransaction.create({
      data: { userId, amount, type, reason },
    });

    return updated;
  });
}