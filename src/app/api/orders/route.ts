import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireStudent, serverError, unauthorized } from "@/lib/guards";

// Tələbə öz sifarişlərini, müəllim bütün sifarişləri görür
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const orders = await prisma.order.findMany({
      where: currentUser.role === "TEACHER" ? {} : { userId: currentUser.id },
      include: {
        product: true,
        ...(currentUser.role === "TEACHER"
          ? { user: { select: { id: true, name: true, phone: true, email: true } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireStudent();
    if ("response" in auth) return auth.response;
    const { user } = auth;

    const { productId, quantity } = await req.json();
    return await placeOrder(user.id, productId, Number(quantity ?? 1));
  } catch (error) {
    return serverError(error);
  }
}

async function placeOrder(userId: string, productId: string, qty: number) {
  if (!productId) {
    return NextResponse.json({ error: "Məhsul seçilməyib" }, { status: 400 });
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    return NextResponse.json({ error: "Miqdar 1-20 arasında olmalıdır" }, { status: 400 });
  }

  try {
    // Stok yoxlaması, coin çıxılması və sifariş tam atomik olsun
    const order = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) throw new Error("Məhsul tapılmadı");

      // Stok şərti ilə azalt — yarış vəziyyətində mənfi stok olmasın
      const dec = await tx.product.updateMany({
        where: { id: productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (dec.count === 0) throw new Error("Stokda kifayət qədər yoxdur");

      const totalCost = product.price * qty;
      const buyer = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (buyer.coinBalance < totalCost) throw new Error("Kifayət qədər coin yoxdur");

      await tx.user.update({ where: { id: userId }, data: { coinBalance: { decrement: totalCost } } });
      await tx.coinTransaction.create({
        data: { userId, amount: -totalCost, type: "PURCHASE", reason: `${product.name} x${qty}` },
      });

      return tx.order.create({
        data: { userId, productId, quantity: qty, totalCost },
        include: { product: true },
      });
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xəta baş verdi" },
      { status: 400 },
    );
  }
}
