import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { notFound, requireAdmin, serverError } from "@/lib/guards";
import { ADMIN_KINDS } from "@/lib/adminKinds";

type Ctx = { params: Promise<{ kind: string; id: string }> };

const missing = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { kind, id } = await params;
    const spec = ADMIN_KINDS[kind];
    if (!spec) return NextResponse.json({ error: "Naməlum bölmə" }, { status: 400 });
    const body = await req.json();
    try {
      await spec.update(id, body && typeof body === "object" ? body : {});
    } catch (e) {
      if (missing(e)) return notFound();
      throw e;
    }
    return NextResponse.json({ message: "Yadda saxlanıldı" });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;
    const { kind, id } = await params;
    const spec = ADMIN_KINDS[kind];
    if (!spec) return NextResponse.json({ error: "Naməlum bölmə" }, { status: 400 });
    try {
      await spec.remove(id);
    } catch (e) {
      if (missing(e)) return notFound();
      throw e;
    }
    return NextResponse.json({ message: "Silindi" });
  } catch (error) {
    return serverError(error);
  }
}
