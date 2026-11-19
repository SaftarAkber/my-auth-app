-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_postId_userId_key" ON "post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "post_likes_userId_idx" ON "post_likes"("userId");

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "group_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: son dərc vaxtı (tələbə bildirişləri)
ALTER TABLE "videos" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "topics" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "test_packages" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Artıq dərc olunmuşlar üçün yaradılma vaxtı götürülür
UPDATE "videos" SET "publishedAt" = "createdAt" WHERE "isPublished" = true;
UPDATE "topics" SET "publishedAt" = "createdAt" WHERE "isPublished" = true;
UPDATE "test_packages" SET "publishedAt" = "createdAt" WHERE "isPublished" = true;
