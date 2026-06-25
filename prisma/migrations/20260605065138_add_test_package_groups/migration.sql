-- AlterTable
ALTER TABLE "test_packages" ADD COLUMN     "allowRetry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "video_packages" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "video_package_groups" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "video_package_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_package_groups" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "test_package_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_package_groups_packageId_groupId_key" ON "video_package_groups"("packageId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "test_package_groups_packageId_groupId_key" ON "test_package_groups"("packageId", "groupId");

-- AddForeignKey
ALTER TABLE "video_package_groups" ADD CONSTRAINT "video_package_groups_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "video_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_package_groups" ADD CONSTRAINT "video_package_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_groups" ADD CONSTRAINT "test_package_groups_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "test_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_groups" ADD CONSTRAINT "test_package_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
