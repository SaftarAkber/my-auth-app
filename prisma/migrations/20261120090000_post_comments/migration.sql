-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comment_likes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "post_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_comments_postId_parentId_createdAt_idx" ON "post_comments"("postId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "post_comments_parentId_idx" ON "post_comments"("parentId");

-- CreateIndex
CREATE INDEX "post_comment_likes_userId_idx" ON "post_comment_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_comment_likes_commentId_userId_key" ON "post_comment_likes"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "group_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_likes" ADD CONSTRAINT "post_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_likes" ADD CONSTRAINT "post_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

