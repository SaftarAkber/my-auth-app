import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optionalUser, requireTeacher, serverError } from "@/lib/guards";

// Tələbələr yalnız aktiv məhsulları görür; müəllim ?all=1 ilə hamısını
export async function GET(req: NextRequest) {
  try {
    const user = await optionalUser();
    const all = new URL(req.url).searchParams.get("all") === "1" && user?.role === "TEACHER";

    const products = await prisma.product.findMany({
      where: all ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;

    const { name, description, price, imageUrl, stock } = await req.json();
    const priceNum = Number(price);
    const stockNum = Number(stock ?? 0);
    if (!name || !Number.isInteger(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: "Ad və müsbət tam qiymət məcburidir" }, { status: 400 });
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return NextResponse.json({ error: "Stok mənfi ola bilməz" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: { name, description: description || null, price: priceNum, imageUrl: imageUrl || null, stock: stockNum },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
