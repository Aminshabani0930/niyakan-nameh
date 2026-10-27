import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { normalizePersianText } from "@/lib/source-library";

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const query = normalizePersianText(new URL(req.url).searchParams.get("q") ?? "");
    if (query.length < 2) return NextResponse.json({ results: [] });
    const terms = (query.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
    if (!terms.length) return NextResponse.json({ results: [] });
    const tsQuery = terms.join(" & ");
    const results = await db.$queryRaw<Array<{ id: string; sourceId: string; sequence: number; title: string; text: string; chapterPage: string | null; sourceTitle: string; rank: number }>>(Prisma.sql`
    SELECT c."id", c."sourceId", c."sequence", c."title", c."text", c."chapterPage",
           s."title" AS "sourceTitle",
           ts_rank(to_tsvector('simple', c."normalizedText"), to_tsquery('simple', ${tsQuery})) AS "rank"
    FROM "SourceChunk" c
    JOIN "Source" s ON s."id" = c."sourceId"
    WHERE to_tsvector('simple', c."normalizedText") @@ to_tsquery('simple', ${tsQuery})
    ORDER BY "rank" DESC
    LIMIT 30
  `);
    return NextResponse.json({ results });
}
