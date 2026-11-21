import { NextResponse } from "next/server";
import { serverError } from "@/lib/guards";
import { getVapid } from "@/lib/push";

// Brauzerin bildiriş abunəliyi üçün açıq açar (gizli açar heç vaxt göndərilmir)
export async function GET() {
  try {
    const { publicKey } = await getVapid();
    return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    return serverError(error);
  }
}
