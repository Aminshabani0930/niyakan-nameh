CREATE TYPE "SourceType" AS ENUM ('SHAHNAMEH', 'HISTORY', 'ARCHITECTURE', 'CYRUS', 'OTHER');
CREATE TYPE "HistoryPeriod" AS ENUM ('MYTHICAL', 'ACHAEMENID', 'PARTHIAN', 'SASANIAN', 'ISLAMIC', 'SAFAVID', 'AFSHARID', 'ZAND', 'QAJAR');
CREATE TYPE "ArchitectureStatus" AS ENUM ('NEEDS_REVIEW', 'APPROVED');

CREATE TABLE "Source" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "authorEditor" TEXT NOT NULL DEFAULT '',
  "type" "SourceType" NOT NULL,
  "yearEdition" TEXT NOT NULL DEFAULT '',
  "license" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL DEFAULT '',
  "contentHash" TEXT,
  "notes" TEXT NOT NULL DEFAULT '',
  "period" "HistoryPeriod",
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Source_contentHash_key" ON "Source"("contentHash");
CREATE INDEX "Source_type_uploadedAt_idx" ON "Source"("type", "uploadedAt");
CREATE INDEX "Source_period_idx" ON "Source"("period");

CREATE TABLE "SourceChunk" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "text" TEXT NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "chapterPage" TEXT,
  "period" "HistoryPeriod",
  CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SourceChunk_sourceId_sequence_key" ON "SourceChunk"("sourceId", "sequence");
CREATE INDEX "SourceChunk_sourceId_sequence_idx" ON "SourceChunk"("sourceId", "sequence");
CREATE INDEX "SourceChunk_period_idx" ON "SourceChunk"("period");
CREATE INDEX "SourceChunk_normalizedText_fts_idx" ON "SourceChunk" USING GIN (to_tsvector('simple', "normalizedText"));
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ArchitectureEntry" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "cityProvince" TEXT NOT NULL DEFAULT '',
  "style" TEXT NOT NULL DEFAULT '',
  "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ArchitectureStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArchitectureEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchitectureEntry_status_period_idx" ON "ArchitectureEntry"("status", "period");

CREATE TABLE "ArchitectureSource" (
  "entryId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  CONSTRAINT "ArchitectureSource_pkey" PRIMARY KEY ("entryId", "sourceId")
);
CREATE INDEX "ArchitectureSource_sourceId_idx" ON "ArchitectureSource"("sourceId");
ALTER TABLE "ArchitectureSource" ADD CONSTRAINT "ArchitectureSource_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "ArchitectureEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureSource" ADD CONSTRAINT "ArchitectureSource_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShahnamehStory" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "ShahnamehStory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShahnamehStory_title_order_key" ON "ShahnamehStory"("title", "order");
CREATE INDEX "ShahnamehStory_order_idx" ON "ShahnamehStory"("order");

CREATE TABLE "ShahnamehVerse" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "firstHemistich" TEXT NOT NULL,
  "secondHemistich" TEXT NOT NULL,
  CONSTRAINT "ShahnamehVerse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShahnamehVerse_storyId_order_key" ON "ShahnamehVerse"("storyId", "order");
CREATE INDEX "ShahnamehVerse_storyId_order_idx" ON "ShahnamehVerse"("storyId", "order");
ALTER TABLE "ShahnamehVerse" ADD CONSTRAINT "ShahnamehVerse_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "ShahnamehStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
