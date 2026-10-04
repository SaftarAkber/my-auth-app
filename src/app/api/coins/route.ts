import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverError, unauthorized } from "@/lib/guards";

// Cari istifadəçinin balansı və son coin əməliyyatları
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUser.id }, select: { coinBalance: true } }),
      prisma.coinTransaction.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return NextResponse.json({ balance: user?.coinBalance ?? 0, transactions });
  } catch (error) {
    return serverError(error);
  }
}
