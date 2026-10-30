ALTER TABLE "collections" ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

ALTER TABLE "test_packages" ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

CREATE TABLE "collection_groups" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  CONSTRAINT "collection_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collection_groups_collectionId_groupId_key" ON "collection_groups"("collectionId", "groupId");

ALTER TABLE "collection_groups" ADD CONSTRAINT "collection_groups_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_groups" ADD CONSTRAINT "collection_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
