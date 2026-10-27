import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { reviewGroundedResearch } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const entry = await db.researchEntry.findUnique({
        where: { id },
        include: {
            citations: { include: { chunk: { include: { source: { select: { title: true } } } } } },
        },
    });
    if (!entry || !entry.citations.length) return NextResponse.json({ error: "برای بازبینی خودکار، ارجاع معتبر لازم است." }, { status: 409 });
    const sources = [...new Map(entry.citations.map(item => [item.chunkId, {
        sourceId: item.chunk.sourceId, sourceTitle: item.chunk.source.title, sequence: item.chunk.sequence,
        chunkTitle: item.chunk.title, text: item.chunk.text,
    }])).values()];
    try {
        const result = await reviewGroundedResearch({
            title: entry.title, text: entry.text,
            claims: entry.citations.map(item => ({ claim: item.claim, citations: [{ sourceId: item.chunk.sourceId, sequence: item.chunk.sequence }] })),
            sources,
        });
        const passed = result.reviews.length === entry.citations.length && result.reviews.every(item => item.supported);
        const updated = await db.researchEntry.update({
            where: { id },
            data: {
                autoReviewPassed: passed,
                status: "NEEDS_REVIEW",
                reviewNotes: passed ? "بازبینی مجدد موفق بود؛ تأیید انسانی همچنان لازم است." : "ارجاع یا پشتیبانی ادعا کامل نیست؛ این مطلب تأیید نمی‌شود.",
                unsupportedClaims: passed ? [] : [...new Set(result.reviews.filter(item => !item.supported).map(item => item.claim))],
            },
        });
        return NextResponse.json({ entry: updated, autoReviewPassed: passed, reviewCount: result.reviews.length });
    } catch {
        return NextResponse.json({ error: "بازبینی خودکار ناموفق بود؛ مطلب همچنان نیازمند بررسی است." }, { status: 502 });
    }
}
