CREATE TYPE "ResearchConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "InstagramDraftType" AS ENUM ('CAPTION', 'CAROUSEL', 'REEL', 'STORY');
ALTER TYPE "ReviewStatus" ADD VALUE 'REJECTED';

CREATE TABLE "ResearchEntry" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "unsupportedClaims" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "confidence" "ResearchConfidence" NOT NULL DEFAULT 'LOW',
  "autoReviewPassed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reviewNotes" TEXT NOT NULL DEFAULT '',
  "status" "ReviewStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchEntry_status_topicId_createdAt_idx" ON "ResearchEntry"("status", "topicId", "createdAt");

CREATE TABLE "ResearchCitation" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  "claim" TEXT NOT NULL,
  CONSTRAINT "ResearchCitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchCitation_entryId_chunkId_idx" ON "ResearchCitation"("entryId", "chunkId");
CREATE INDEX "ResearchCitation_chunkId_idx" ON "ResearchCitation"("chunkId");
ALTER TABLE "ResearchCitation" ADD CONSTRAINT "ResearchCitation_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "ResearchEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearchCitation" ADD CONSTRAINT "ResearchCitation_chunkId_fkey"
  FOREIGN KEY ("chunkId") REFERENCES "SourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstagramDraft" (
  "id" TEXT NOT NULL,
  "researchEntryId" TEXT NOT NULL,
  "type" "InstagramDraftType" NOT NULL,
  "content" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstagramDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstagramDraft_researchEntryId_createdAt_idx" ON "InstagramDraft"("researchEntryId", "createdAt");
ALTER TABLE "InstagramDraft" ADD CONSTRAINT "InstagramDraft_researchEntryId_fkey"
  FOREIGN KEY ("researchEntryId") REFERENCES "ResearchEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
