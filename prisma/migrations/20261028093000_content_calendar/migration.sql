CREATE TYPE "CalendarFormat" AS ENUM ('POST', 'CAROUSEL', 'REEL', 'STORY');
CREATE TYPE "CalendarGoal" AS ENUM ('ATTRACT', 'ENGAGE', 'SAVE', 'SHARE');
CREATE TYPE "CalendarPeriod" AS ENUM ('MORNING', 'NOON', 'AFTERNOON', 'NIGHT');
CREATE TYPE "CalendarStatus" AS ENUM ('SUGGESTED', 'DRAFT', 'APPROVED');
ALTER TYPE "PlanContentType" ADD VALUE 'STORY';

ALTER TABLE "AppSetting"
  ADD COLUMN "weeklyPattern" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "digestTime" TEXT NOT NULL DEFAULT '08:00';

CREATE TABLE "CalendarItem" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "time" TEXT NOT NULL,
  "period" "CalendarPeriod",
  "format" "CalendarFormat" NOT NULL,
  "topic" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "goal" "CalendarGoal" NOT NULL,
  "hook" TEXT NOT NULL,
  "status" "CalendarStatus" NOT NULL DEFAULT 'SUGGESTED',
  "sourceTag" TEXT NOT NULL DEFAULT 'بدون داده‌ی آماری',
  "occasion" TEXT,
  "planItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarItem_planItemId_key" ON "CalendarItem"("planItemId");
CREATE INDEX "CalendarItem_date_status_idx" ON "CalendarItem"("date", "status");
CREATE INDEX "CalendarItem_format_date_idx" ON "CalendarItem"("format", "date");
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_planItemId_fkey"
  FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
