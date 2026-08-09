import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { adjustCoins } from "@/lib/coins";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: currentUser.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "STUDENT") {
    return NextResponse.json({ error: "Yalnız tələbələr alış-veriş edə bilər" }, { status: 403 });
  }

  const { productId, quantity = 1 } = await req.json();
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Məhsul tapılmadı" }, { status: 404 });
  }
  if (product.stock < quantity) {
    return NextResponse.json({ error: "Stokda kifayət qədər yoxdur" }, { status: 400 });
  }

  const totalCost = product.price * quantity;

  try {
    const order = await prisma.$transaction(async (tx) => {
      await adjustCoins(currentUser.id, -totalCost, "PURCHASE", `${product.name} x${quantity}`);
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } },
      });
      return tx.order.create({
        data: { userId: currentUser.id, productId: product.id, quantity, totalCost },
        include: { product: true },
      });
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Xəta baş verdi" },
      { status: 400 }
    );
  }
}