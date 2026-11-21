-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedContact" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limits_resetAt_idx" ON "rate_limits"("resetAt");

