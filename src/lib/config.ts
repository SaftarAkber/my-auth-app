// Müəllim qeydiyyat limiti — bütün yerlərdə bu dəyər istifadə olunur
export const TEACHER_LIMIT = 3;

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
