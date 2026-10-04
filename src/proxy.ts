import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "auth_token";
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];
const PROTECTED_PREFIXES = ["/student", "/teacher", "/dashboard"];

// Yalnız cookie-nin varlığına baxır (token yoxlaması və rol yoxlaması API və layout-lardadır).
// Məqsəd: girişsiz istifadəçini dərhal /login-ə yönləndirmək, girişli istifadəçini auth səhifələrindən uzaqlaşdırmaq.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = !!req.cookies.get(AUTH_COOKIE)?.value;

  if (!hasToken && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasToken && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password", "/dashboard/:path*", "/student/:path*", "/teacher/:path*"],
};
