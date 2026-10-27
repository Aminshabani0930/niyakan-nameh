CREATE TYPE "CyrusSection" AS ENUM ('BIOGRAPHY', 'TIMELINE', 'CONQUESTS', 'CYRUS_CYLINDER', 'PASARGADAE', 'SOURCES', 'LATER_TRADITIONS', 'GALLERY', 'Q_AND_A');
CREATE TYPE "ReviewStatus" AS ENUM ('NEEDS_REVIEW', 'APPROVED');

CREATE TABLE "CyrusEntry" (
  "id" TEXT NOT NULL,
  "section" "CyrusSection" NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "order" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CyrusEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CyrusEntry_section_status_order_idx" ON "CyrusEntry"("section", "status", "order");

CREATE TABLE "CyrusEntryCitation" (
  "entryId" TEXT NOT NULL,
  "chunkId" TEXT NOT NULL,
  CONSTRAINT "CyrusEntryCitation_pkey" PRIMARY KEY ("entryId", "chunkId")
);
CREATE INDEX "CyrusEntryCitation_chunkId_idx" ON "CyrusEntryCitation"("chunkId");
ALTER TABLE "CyrusEntryCitation" ADD CONSTRAINT "CyrusEntryCitation_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "CyrusEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CyrusEntryCitation" ADD CONSTRAINT "CyrusEntryCitation_chunkId_fkey"
  FOREIGN KEY ("chunkId") REFERENCES "SourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
