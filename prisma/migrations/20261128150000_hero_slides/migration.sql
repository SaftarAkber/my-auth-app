CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'template',
    "template" TEXT,
    "tag" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "highlight" TEXT,
    "note" TEXT,
    "imageUrl" TEXT,
    "countdownAt" TIMESTAMP(3),
    "timerPos" TEXT NOT NULL DEFAULT 'bl',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hero_slides_isActive_order_idx" ON "hero_slides"("isActive", "order");
