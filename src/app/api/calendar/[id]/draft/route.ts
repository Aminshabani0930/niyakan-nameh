import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createResearchDraft } from "@/lib/research";

export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const item = await db.calendarItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "آیتم تقویم پیدا نشد." }, { status: 404 });
    if (item.planItemId) return NextResponse.json({ error: "برای این آیتم قبلاً پیش‌نویس ساخته شده است." }, { status: 409 });
    try {
        const research = await createResearchDraft({ subject: `${item.topic}: ${item.hook}` });
        const citations = research.entry.citations.map(citation => `${citation.chunk.source.title}، بخش ${citation.chunk.sequence}`);
        const result = await db.$transaction(async transaction => {
            const content = await transaction.contentItem.create({
                data: {
                    title: research.entry.title,
                    caption: `${research.entry.text}\n\nمنبع: ${citations.join("؛ ")}`,
                    script: research.entry.text,
                    category: item.category,
                    format: item.format,
                    status: "IDEA",
                    publishDate: item.date,
                    source: "AI",
                },
            });
            const planItem = await transaction.planItem.create({
                data: {
                    topic: item.topic, publishDate: item.date, type: item.format,
                    tone: "فارسی روان و مستند",
                    notes: `پژوهش: ${research.entry.id}\nقلاب: ${item.hook}\nمنابع: ${citations.join("؛ ")}`,
                    status: "DRAFT", contentId: content.id,
                },
            });
            const calendarItem = await transaction.calendarItem.update({ where: { id }, data: { planItemId: planItem.id, status: "DRAFT" } });
            return { planItem, calendarItem };
        });
        return NextResponse.json({ ...result, researchEntryId: research.entry.id, researchStatus: research.entry.status, autoReviewPassed: research.autoReviewPassed }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "تولید پیش‌نویس مستند ناموفق بود." }, { status: 502 });
    }
}
