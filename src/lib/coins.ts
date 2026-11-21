import { prisma } from "@/lib/prisma";
import { CoinTransactionType, Prisma } from "@prisma/client";

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

export class InsufficientCoins extends Error {
  constructor() {
    super("Balansınızda kifayət qədər coin yoxdur");
  }
}

/** Müəllimdən tələbəyə coin köçürür (bir transaksiyada, balans yoxlanması ilə). */
export async function transferCoins(opts: {
  fromId: string;
  toId: string;
  amount: number;
  reason?: string;
  receivedType?: CoinTransactionType;
  tx?: Prisma.TransactionClient;
}) {
  const { fromId, toId, amount, reason, receivedType = "GIFT_RECEIVED" } = opts;
  const run = async (tx: Prisma.TransactionClient) => {
    // Balansın mənfiyə düşməsinin qarşısı: şərtli yeniləmə
    const debited = await tx.user.updateMany({
      where: { id: fromId, coinBalance: { gte: amount } },
      data: { coinBalance: { decrement: amount } },
    });
    if (debited.count === 0) throw new InsufficientCoins();
    const to = await tx.user.update({ where: { id: toId }, data: { coinBalance: { increment: amount } }, select: { name: true } });
    const from = await tx.user.findUnique({ where: { id: fromId }, select: { name: true } });
    await tx.coinTransaction.createMany({
      data: [
        { userId: fromId, amount: -amount, type: "GIFT_SENT", reason, counterpartyId: toId, counterpartyName: to.name },
        { userId: toId, amount, type: receivedType, reason, counterpartyId: fromId, counterpartyName: from?.name ?? null },
      ],
    });
  };
  if (opts.tx) return run(opts.tx);
  return prisma.$transaction(run);
}
