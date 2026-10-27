import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createResearchDraft, getResearchTopics } from "@/lib/research";

export const maxDuration = 30;

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = z.object({ subject: z.string().trim().min(2).max(300), topicId: z.string().optional(), sourceType: z.enum(["SHAHNAMEH", "HISTORY", "ARCHITECTURE", "CYRUS", "OTHER"]).optional() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "موضوع پژوهش معتبر نیست." }, { status: 400 });
    try {
        const topics = await getResearchTopics();
        const topic = parsed.data.topicId ? topics.find(item => item.id === parsed.data.topicId) : undefined;
        if (parsed.data.topicId && !topic) return NextResponse.json({ error: "موضوع در data/topics.json پیدا نشد." }, { status: 404 });
        const result = await createResearchDraft({ subject: parsed.data.subject, topic, sourceType: parsed.data.sourceType });
        return NextResponse.json({ entry: result.entry, autoReviewPassed: result.autoReviewPassed, reviewNotes: result.reviewNotes }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "ساخت پیش‌نویس پژوهشی ناموفق بود.";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
