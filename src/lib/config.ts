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
