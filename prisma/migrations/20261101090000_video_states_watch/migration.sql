-- Videoların öz dərc vəziyyəti, admin sancağı, şərhə cavab, baxış və bəyənmə
ALTER TABLE "videos" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinOrder" INTEGER;

ALTER TABLE "video_comments" ADD COLUMN "parentId" TEXT;
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "video_comments_videoId_parentId_createdAt_idx" ON "video_comments"("videoId", "parentId", "createdAt");

CREATE TABLE "video_views" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "videoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "video_views_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "video_views_videoId_userId_key" ON "video_views"("videoId", "userId");
CREATE INDEX "video_views_createdAt_idx" ON "video_views"("createdAt");
ALTER TABLE "video_views" ADD CONSTRAINT "video_views_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_views" ADD CONSTRAINT "video_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "video_likes" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "videoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "video_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "video_likes_videoId_userId_key" ON "video_likes"("videoId", "userId");
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Köhnə məlumatın daşınması: videolar öz paketinin vəziyyətini miras alır.
-- 1) Paketin qrupları videoya köçürülür
INSERT INTO "video_groups" ("id", "videoId", "groupId")
SELECT 'vg_' || md5(random()::text || v."id" || g."groupId"), v."id", g."groupId"
FROM "videos" v
JOIN (
  SELECT "packageId", "groupId" FROM "video_package_groups"
  UNION
  SELECT "id" AS "packageId", "groupId" FROM "video_packages" WHERE "groupId" IS NOT NULL
) g ON g."packageId" = v."packageId"
ON CONFLICT ("videoId", "groupId") DO NOTHING;

-- 2) Paketdəki videolar: dərc olunmuş + açıq profil => hamıya açıq; dərc olunmuş + qrup => qruplara; qalanı qaralama
UPDATE "videos" v
SET "isPublished" = CASE
      WHEN p."isPublished" AND (p."isPublic" OR EXISTS (SELECT 1 FROM "video_groups" vg WHERE vg."videoId" = v."id")) THEN true
      ELSE false END,
    "visibility" = CASE
      WHEN p."isPublic" THEN 'PUBLIC'::"ContentVisibility"
      WHEN EXISTS (SELECT 1 FROM "video_groups" vg WHERE vg."videoId" = v."id") THEN 'GROUP_ONLY'::"ContentVisibility"
      ELSE v."visibility" END
FROM "video_packages" p
WHERE v."packageId" = p."id";

-- 3) Paketsiz videolar öz görünürlüyü ilə dərc olunmuş sayılır
UPDATE "videos" SET "isPublished" = true WHERE "packageId" IS NULL;
