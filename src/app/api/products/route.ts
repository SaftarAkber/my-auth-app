import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

// İstəsəniz müəllim də əlavə edə bilsin deyə POST (yoxsa admin-only saxlayın)
export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "TEACHER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { name, description, price, imageUrl, stock } = await req.json();
  if (!name || !price) {
    return NextResponse.json({ error: "Ad və qiymət məcburidir" }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: { name, description, price, imageUrl, stock: stock ?? 0 },
  });
  return NextResponse.json({ product }, { status: 201 });
}