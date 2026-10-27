-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "imageError" TEXT,
ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "postMix" TEXT NOT NULL DEFAULT 'MIX',
    "postsPerWeek" INTEGER NOT NULL DEFAULT 4,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "agentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "imageStyle" TEXT NOT NULL DEFAULT 'نگارگری ایرانی، مینیاتور صفوی، بافت کاغذ کهنه، رنگ‌های خاکی، لاجوردی و طلایی، ترکیب‌بندی سینمایی، بدون متن و واترمارک',
    "carouselSlides" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentItem_status_publishDate_idx" ON "ContentItem"("status", "publishDate");
