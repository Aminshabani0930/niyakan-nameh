import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePersianText } from "@/lib/source-library";
import { reviewGroundedResearch, writeGroundedResearch, type GroundedResearch } from "@/lib/ai";

const TopicList = z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    period: z.string().default(""),
    queries: z.array(z.string().min(1)).min(1),
}));

export type ResearchTopic = z.infer<typeof TopicList>[number];
type RetrievedSource = { chunkId: string; sourceId: string; sourceTitle: string; sequence: number; chunkTitle: string; text: string };

export async function getResearchTopics() {
    const file = await readFile(path.join(process.cwd(), "data", "topics.json"), "utf8");
    return TopicList.parse(JSON.parse(file));
}

function termsFor(query: string) {
    return (normalizePersianText(query).match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
}

export async function retrieveSourceChunks(input: { subject: string; queries?: string[]; limit?: number; sourceType?: string }) {
    const queryList = [...new Set([input.subject, ...(input.queries ?? [])].map(value => value.trim()).filter(Boolean))].slice(0, 5);
    const results = new Map<string, RetrievedSource>();
    for (const phrase of queryList) {
        const terms = termsFor(phrase);
        if (!terms.length) continue;
        const tsQuery = terms.join(" & ");
        const rows = await db.$queryRaw<RetrievedSource[]>(Prisma.sql`
      SELECT c."id" AS "chunkId", c."sourceId", s."title" AS "sourceTitle", c."sequence", c."title" AS "chunkTitle", c."text"
      FROM "SourceChunk" c JOIN "Source" s ON s."id" = c."sourceId"
      WHERE to_tsvector('simple', c."normalizedText") @@ to_tsquery('simple', ${tsQuery})
        AND (${input.sourceType ?? null}::"SourceType" IS NULL OR s."type" = ${input.sourceType ?? null}::"SourceType")
      ORDER BY ts_rank(to_tsvector('simple', c."normalizedText"), to_tsquery('simple', ${tsQuery})) DESC
      LIMIT 8
    `);
        for (const row of rows) results.set(`${row.sourceId}:${row.sequence}`, row);
    }
    return [...results.values()].slice(0, Math.max(1, Math.min(20, input.limit ?? 12)));
}

export async function createResearchDraft(input: { subject: string; topic?: ResearchTopic; sourceType?: string }) {
    const sources = await retrieveSourceChunks({
        subject: input.subject,
        queries: input.topic?.queries,
        sourceType: input.sourceType,
        limit: 6,
    });
    if (!sources.length) throw new Error("در منابع موجود پشتوانه‌ای نیست؛ ابتدا منبع مرتبط بارگذاری کنید.");

    const draft = await writeGroundedResearch({ subject: input.subject, topic: input.topic?.title ?? input.subject, sources });
    const available = new Map(sources.map(source => [`${source.sourceId}:${source.sequence}`, source]));
    const requestedPairs = new Set<string>();
    const safeClaims: GroundedResearch["claims"] = [];
    for (const item of draft.claims) {
        const validCitations = (item.citations ?? []).filter(citation => available.has(`${citation.sourceId}:${citation.sequence}`));
        if (validCitations.length) {
            safeClaims.push({ ...item, citations: validCitations });
            for (const citation of validCitations) requestedPairs.add(`${item.claim}:${citation.sourceId}:${citation.sequence}`);
        }
    }
    const review = safeClaims.length ? await reviewGroundedResearch({ ...draft, claims: safeClaims, sources }) : { reviews: [] };
    const accepted = review.reviews.filter(item => item.supported && requestedPairs.has(`${item.claim}:${item.sourceId}:${item.sequence}`) && available.has(`${item.sourceId}:${item.sequence}`));
    const requestedCount = safeClaims.reduce((count, item) => count + item.citations.length, 0);
    const everyCitationVerified = accepted.length === requestedCount && requestedCount > 0;
    const unsupported = [...(draft.unsupportedClaims ?? []), ...review.reviews.filter(item => !item.supported).map(item => item.claim)];
    const autoReviewPassed = everyCitationVerified && unsupported.length === 0;
    const reviewNotes = autoReviewPassed ? "همه‌ی ارجاع‌ها با منبع واقعی تطبیق داده شدند؛ تأیید انسانی همچنان لازم است." : "برخی ادعاها یا ارجاع‌ها نیازمند بررسی انسانی هستند؛ هیچ‌کدام خودکار تأیید نمی‌شوند.";

    const entry = await db.researchEntry.create({
        data: {
            topicId: input.topic?.id ?? "custom",
            subject: input.subject,
            title: draft.title,
            text: draft.text,
            confidence: draft.confidence,
            unsupportedClaims: [...new Set(unsupported)],
            autoReviewPassed,
            reviewNotes,
            status: "NEEDS_REVIEW",
            citations: {
                create: accepted.map(citation => ({
                    chunkId: sources.find(source => source.sourceId === citation.sourceId && source.sequence === citation.sequence)!.chunkId,
                    claim: citation.claim,
                })),
            },
        },
        include: { citations: { include: { chunk: { include: { source: { select: { title: true } } } } } } },
    });
    return { entry, sources, autoReviewPassed, reviewNotes };
}
