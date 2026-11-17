-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "difficulty" "Difficulty";

-- AlterTable
ALTER TABLE "test_packages" ADD COLUMN "isBank" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "drawEasy" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "drawMedium" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "drawHard" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "isMonthly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_attempts" ADD COLUMN "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "draft" JSONB;

-- CreateIndex
CREATE INDEX "student_attempts_packageId_studentId_idx" ON "student_attempts"("packageId", "studentId");
