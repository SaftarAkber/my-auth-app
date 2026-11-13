import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, requireTeacher, serverError } from "@/lib/guards";
import { cleanIds } from "@/lib/topics";

/** Mövzuların sırası (müəllim): verilən ardıcıllıqla 1, 2, 3… */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireTeacher();
    if ("response" in auth) return auth.response;
    const b = await req.json().catch(() => ({}));
    const ids = cleanIds(b.ids, 300) ?? [];
    if (!ids.length) return NextResponse.json({ ok: true });
    const n = await prisma.topic.count({ where: { id: { in: ids }, teacherId: auth.user.id } });
    if (n !== ids.length) return forbidden();
    await prisma.$transaction(ids.map((id, i) => prisma.topic.update({ where: { id }, data: { order: i + 1 } })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
