CREATE TYPE "PlanContentType" AS ENUM ('POST', 'CAROUSEL', 'REEL');

CREATE TYPE "PlanItemStatus" AS ENUM ('PLANNED', 'GENERATING', 'DRAFT', 'APPROVED', 'FAILED');

CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "type" "PlanContentType" NOT NULL,
    "tone" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "PlanItemStatus" NOT NULL DEFAULT 'PLANNED',
    "errorMessage" TEXT,
    "contentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanItem_contentId_key" ON "PlanItem"("contentId");
CREATE INDEX "PlanItem_publishDate_status_idx" ON "PlanItem"("publishDate", "status");
CREATE INDEX "PlanItem_status_idx" ON "PlanItem"("status");

ALTER TABLE "PlanItem"
ADD CONSTRAINT "PlanItem_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "ContentItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
