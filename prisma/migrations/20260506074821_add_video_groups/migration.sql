-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coverPhoto" TEXT;

-- AlterTable
ALTER TABLE "video_packages" ADD COLUMN     "teacherId" TEXT;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "video_groups" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "video_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_groups_videoId_groupId_key" ON "video_groups"("videoId", "groupId");

-- AddForeignKey
ALTER TABLE "video_packages" ADD CONSTRAINT "video_packages_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_groups" ADD CONSTRAINT "video_groups_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_groups" ADD CONSTRAINT "video_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
