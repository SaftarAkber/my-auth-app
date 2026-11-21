// Yeni müəllim hesabına verilən başlanğıc coin; tələbələr 0 ilə başlayır
export const TEACHER_START_COINS = 500;

export const AUTH_COOKIE = "auth_token";
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Telefonu bazadakı formata (+994XXXXXXXXX) gətirir: boşluq, tire, mötərizə silinir;
 * "00994…", "994…", "050…" və "50…" yazılışları da qəbul olunur. Telefon deyilsə olduğu kimi qaytarır.
 */
export function normalizePhone(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!/^[\d\s()+.-]+$/.test(s)) return s;
  let d = s.replace(/[\s().-]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("+")) return d;
  if (/^994\d{9}$/.test(d)) return "+" + d;
  if (/^0\d{9}$/.test(d)) return "+994" + d.slice(1);
  if (/^\d{9}$/.test(d)) return "+994" + d;
  return d;
}
