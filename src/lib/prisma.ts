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

function makeClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  client.$use((params, next) => {
    if (params.model && SOFT.has(params.model) && READS.has(params.action)) {
      const where = params.args?.where;
      if (!where || !("deletedAt" in where)) {
        params.args = { ...(params.args ?? {}), where: { ...(where ?? {}), deletedAt: null } };
      }
    }
    return next(params);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
