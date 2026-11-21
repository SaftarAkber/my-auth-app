import { prisma } from "@/lib/prisma";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}
type Result = { allowed: boolean; retryAfterMs: number };

/* Yedək: baza əlçatmaz olsa, yaddaşdakı sayğac (bir server daxilində) */
const store = new Map<string, { count: number; resetAt: number }>();
function memoryLimit(key: string, o: RateLimitOptions): Result {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now > e.resetAt) {
    store.set(key, { count: 1, resetAt: now + o.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  e.count++;
  return e.count > o.maxRequests ? { allowed: false, retryAfterMs: e.resetAt - now } : { allowed: true, retryAfterMs: 0 };
}

/**
 * Cəhd sayğacı bazada saxlanır: Vercel bir neçə server açanda da bütün cəhdlər birlikdə sayılır.
 * Bir SQL əmri ilə atomik: pəncərə bitibsə sıfırdan başlayır, yoxsa sayı artırır.
 */
export async function rateLimit(key: string, o: RateLimitOptions): Promise<Result> {
  try {
    const reset = new Date(Date.now() + o.windowMs);
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "rate_limits" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "rate_limits"."resetAt" < now() THEN 1 ELSE "rate_limits"."count" + 1 END,
        "resetAt" = CASE WHEN "rate_limits"."resetAt" < now() THEN EXCLUDED."resetAt" ELSE "rate_limits"."resetAt" END
      RETURNING "count", "resetAt"`;
    // Arabir köhnə sətirləri təmizləyirik
    if (Math.random() < 0.02) void prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => null);
    const r = rows[0];
    if (!r) return { allowed: true, retryAfterMs: 0 };
    return r.count > o.maxRequests
      ? { allowed: false, retryAfterMs: Math.max(0, new Date(r.resetAt).getTime() - Date.now()) }
      : { allowed: true, retryAfterMs: 0 };
  } catch (e) {
    console.error("rateLimit (baza) xətası, yaddaş sayğacı işlədilir:", e);
    return memoryLimit(key, o);
  }
}

/** Sorğunun əsl IP-si (x-forwarded-for zəncirinin birincisi) */
export function clientIp(req: { headers: Headers }) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
