import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireTeacher, serverError } from "@/lib/guards";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { name, description, price, imageUrl, stock, isActive } = await req.json();

    if (price !== undefined && (!Number.isInteger(Number(price)) || Number(price) <= 0)) {
      return NextResponse.json({ error: "Qiymət müsbət tam ədəd olmalıdır" }, { status: 400 });
    }
    if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
      return NextResponse.json({ error: "Stok mənfi ola bilməz" }, { status: 400 });
    }

    const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound("Məhsul tapılmadı");

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ product });
  } catch (error) {
    return serverError(error);
  }
}

// Sifarişi olan məhsul silinmir, deaktiv edilir
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const orders = await prisma.order.count({ where: { productId: id } });
    if (orders > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ message: "Sifarişləri olduğu üçün deaktiv edildi", deactivated: true });
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
