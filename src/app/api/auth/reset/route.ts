import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/config";

// Etibarsız (məsələn, silinmiş hesaba aid) cookie-ni təmizləyir və ana səhifəyə qaytarır.
// Bu olmadan proxy /login-i “girişlidir” sanıb ana səhifəyə yönləndirir və istifadəçi dövrədə qalır.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
