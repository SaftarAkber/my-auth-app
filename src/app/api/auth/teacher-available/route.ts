import { NextResponse } from "next/server";

// Müəllim qeydiyyat limiti ləğv olunub: həmişə açıqdır (köhnə klientlər üçün endpoint saxlanılır)
export async function GET() {
  return NextResponse.json({ available: true });
}
