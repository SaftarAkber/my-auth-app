import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireTeacher, serverError } from "@/lib/guards";

const FLOW: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["DELIVERED", "REJECTED"],
  REJECTED: [],
  DELIVERED: [],
};

// Müəllim sifariş statusunu dəyişir; rədd olunanda coin qaytarılır və stok bərpa edilir
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { status } = await req.json();

    const order = await prisma.order.findUnique({ where: { id }, include: { product: true } });
    if (!order) return notFound("Sifariş tapılmadı");

    if (!FLOW[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: `${order.status} statusundan ${status} statusuna keçid mümkün deyil` },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === "REJECTED") {
        await tx.user.update({
          where: { id: order.userId },
          data: { coinBalance: { increment: order.totalCost } },
        });
        await tx.coinTransaction.create({
          data: {
            userId: order.userId,
            amount: order.totalCost,
            type: "ADMIN_ADJUST",
            reason: `Sifariş rədd edildi: ${order.product.name} x${order.quantity}`,
          },
        });
        await tx.product.update({
          where: { id: order.productId },
          data: { stock: { increment: order.quantity } },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status },
        include: { product: true, user: { select: { id: true, name: true, phone: true, email: true } } },
      });
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    return serverError(error);
  }
}
