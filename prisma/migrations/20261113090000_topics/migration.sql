-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_groups" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "topic_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_tests" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topic_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_videos" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topic_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_teacherId_order_idx" ON "topics"("teacherId", "order");

-- CreateIndex
CREATE INDEX "topic_groups_groupId_idx" ON "topic_groups"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_groups_topicId_groupId_key" ON "topic_groups"("topicId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_tests_topicId_packageId_key" ON "topic_tests"("topicId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_videos_topicId_videoId_key" ON "topic_videos"("topicId", "videoId");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_groups" ADD CONSTRAINT "topic_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_tests" ADD CONSTRAINT "topic_tests_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_tests" ADD CONSTRAINT "topic_tests_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "test_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_videos" ADD CONSTRAINT "topic_videos_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_videos" ADD CONSTRAINT "topic_videos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

