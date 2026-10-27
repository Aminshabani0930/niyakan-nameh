import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getResearchTopics, retrieveSourceChunks } from "@/lib/research";

export async function GET() {
    const deny = await requireAuth();
    if (deny) return deny;
    try {
        const topics = await getResearchTopics();
        const gaps = [];
        for (const topic of topics.slice(0, 10)) {
            const chunks = await retrieveSourceChunks({ subject: topic.title, queries: topic.queries, limit: 6 });
            const approved = await db.researchEntry.count({ where: { topicId: topic.id, status: "APPROVED" } });
            const published = await db.contentItem.count({
                where: {
                    status: "PUBLISHED", OR: [
                        { title: { contains: topic.title } }, { caption: { contains: topic.title } },
                    ]
                }
            });
            if (!chunks.length || !approved || !published) gaps.push({ topicId: topic.id, title: topic.title, sourceChunks: chunks.length, approvedResearch: approved, publishedContent: published, missing: [!chunks.length && "منبع", !approved && "مطلب تأییدشده", !published && "محتوای منتشرشده"].filter(Boolean) });
        }
        return NextResponse.json({ gaps });
    } catch { return NextResponse.json({ error: "تحلیل پوشش منابع و محتوا ناموفق بود." }, { status: 500 }); }
}
