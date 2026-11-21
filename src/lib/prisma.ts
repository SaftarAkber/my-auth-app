import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Yumşaq silinmiş (deletedAt dolu) test paketləri və kolleksiyalar bütün oxuma sorğularında gizlədilir.
 *  Admin silinmişlərə baxmaq üçün where-ə açıq şəkildə `deletedAt` yazır, onda süzgəc tətbiq olunmur. */
const SOFT = new Set(["TestPackage", "Collection"]);
const READS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy",
]);

/** Dərc olunanda publishedAt yazılır (tələbə bildirişləri bunu oxuyur); təkrar saxlanma vaxtı yeniləmir,
 *  qaralamaya qaytarılanda silinir ki, yenidən dərc ediləndə bildiriş təkrar gəlsin. */
const PUBLISHABLE: Record<string, "topic" | "video" | "testPackage"> = { Topic: "topic", Video: "video", TestPackage: "testPackage" };

/** Yeni dərc olunanlar üçün telefon bildirişi (cavabdan sonra, arxa fonda) */
function announce(kind: "topic" | "video" | "testPackage", ids: string[]) {
  if (!ids.length) return;
  void import("./push").then((m) => m.later(() => m.notifyPublished(kind, ids))).catch(() => null);
}

function makeClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  client.$use(async (params, next) => {
    if (params.model && SOFT.has(params.model) && READS.has(params.action)) {
      const where = params.args?.where;
      if (!where || !("deletedAt" in where)) {
        params.args = { ...(params.args ?? {}), where: { ...(where ?? {}), deletedAt: null } };
      }
    }
    const delegate = params.model ? PUBLISHABLE[params.model] : undefined;
    if (delegate && (params.action === "create" || params.action === "update" || params.action === "updateMany" || params.action === "upsert")) {
      const data = params.action === "upsert" ? params.args?.update : params.args?.data;
      const pub = data && typeof data === "object" ? (data as { isPublished?: unknown }).isPublished : undefined;
      if (params.action === "create" && pub === true) {
        params.args.data = { ...params.args.data, publishedAt: new Date() };
        const created = await next(params);
        if (created && typeof created === "object" && "id" in created) announce(delegate, [String((created as { id: string }).id)]);
        return created;
      } else if (pub === false) {
        if (params.action === "upsert") params.args.update = { ...params.args.update, publishedAt: null };
        else params.args.data = { ...params.args.data, publishedAt: null };
      } else if (pub === true && params.args?.where) {
        // Tranzaksiya içində kilid gözləməsin deyə: əvvəl (tranzaksiyadan kənar, kilidsiz) oxunur,
        // sonra vaxt eyni yazı əməliyyatına əlavə olunur
        const d = client[delegate] as unknown as { findMany: (a: unknown) => Promise<{ id: string }[]> };
        const fresh = await d.findMany({ where: { ...params.args.where, publishedAt: null }, select: { id: true } });
        const now = new Date();
        if (params.action === "upsert") {
          if (params.args.create?.isPublished === true) params.args.create = { ...params.args.create, publishedAt: now };
          if (fresh.length) params.args.update = { ...params.args.update, publishedAt: now };
          const r = await next(params);
          if (r && typeof r === "object" && "id" in r) {
            const rid = String((r as { id: string }).id);
            // ilk dəfə dərc olunub (upsert bu modellərdə işlədilmir)
            if (fresh.some((f) => f.id === rid)) announce(delegate, [rid]);
          }
          return r;
        } else if (params.action === "update") {
          if (fresh.length) {
            params.args.data = { ...params.args.data, publishedAt: now };
            const r = await next(params);
            announce(delegate, fresh.map((f) => f.id));
            return r;
          }
        } else if (fresh.length) {
          const result = await next(params);
          await next({ ...params, args: { where: { id: { in: fresh.map((f) => f.id) } }, data: { publishedAt: now } } });
          announce(delegate, fresh.map((f) => f.id));
          return result;
        }
      }
    }
    return next(params);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
