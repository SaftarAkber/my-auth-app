-- AlterTable: müəllimin tədris etdiyi fənlər (ən çoxu 2, id-lər kimi saxlanılır)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[];
