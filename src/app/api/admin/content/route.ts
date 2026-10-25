import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/guards";
import { ADMIN_KINDS } from "@/lib/adminKinds";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);

    // kind verilməyibsə yalnız növlər və say qaytarılır
    if (!kind) {
      const kinds = Object.entries(ADMIN_KINDS).map(([k, s]) => ({ kind: k, label: s.label }));
      return NextResponse.json({ kinds });
    }
    const spec = ADMIN_KINDS[kind];
    if (!spec) return NextResponse.json({ error: "Naməlum bölmə" }, { status: 400 });

    const items = await spec.list(q);
    return NextResponse.json({ kind, label: spec.label, fields: spec.fields, items });
  } catch (error) {
    return serverError(error);
  }
}
