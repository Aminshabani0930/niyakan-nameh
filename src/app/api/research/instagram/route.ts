import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { writeInstagramDraft } from "@/lib/ai";
import { getSettingsOrDefault } from "@/lib/settings";

export const maxDuration = 30;

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = z.object({ researchEntryId: z.string().min(1), type: z.enum(["CAPTION", "CAROUSEL", "REEL", "STORY"]) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "مطلب و قالب پیش‌نویس معتبر نیست." }, { status: 400 });
    const entry = await db.researchEntry.findUnique({
        where: { id: parsed.data.researchEntryId, status: "APPROVED" },
        include: {
            citations: { include: { chunk: { include: { source: { select: { title: true } } } } } },
        },
    });
    if (!entry || !entry.citations.length) return NextResponse.json({ error: "فقط مطلب تأییدشده با منبع قابل استفاده است." }, { status: 409 });
    try {
        const settings = await getSettingsOrDefault();
        const draft = await writeInstagramDraft({
            title: entry.title, text: entry.text,
            citations: entry.citations.map(citation => `${citation.chunk.source.title}، بخش ${citation.chunkId}`),
            format: parsed.data.type, imageStyle: settings.imageStyle,
        });
        const sourceLines = entry.citations.map(citation => `${citation.chunk.source.title}، بخش ${citation.chunk.sequence}`);
        const saved = await db.instagramDraft.create({ data: { researchEntryId: entry.id, type: parsed.data.type, content: { ...draft, sources: sourceLines }, status: "DRAFT" } });
        return NextResponse.json({ draft: saved, imageError: draft.imageError }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "ساخت پیش‌نویس اینستاگرام ناموفق بود." }, { status: 502 });
    }
}
