import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createResearchDraft } from "@/lib/research";

export const maxDuration = 30;

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = z.object({ section: z.enum(["BIOGRAPHY", "TIMELINE", "CONQUESTS", "CYRUS_CYLINDER", "PASARGADAE", "SOURCES", "LATER_TRADITIONS", "GALLERY", "Q_AND_A"]) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "بخش کوروش معتبر نیست." }, { status: 400 });
    const sourceCount = await db.source.count({ where: { type: "CYRUS" } });
    if (!sourceCount) return NextResponse.json({ error: "ابتدا منبع بارگذاری کنید." }, { status: 409 });
    try {
        const generated = await createResearchDraft({ subject: `کوروش، بخش ${parsed.data.section}`, sourceType: "CYRUS" });
        const entry = await db.cyrusEntry.create({
            data: {
                section: parsed.data.section, title: generated.entry.title, text: generated.entry.text,
                status: "NEEDS_REVIEW", citations: { create: generated.entry.citations.map(citation => ({ chunkId: citation.chunkId })) },
            },
            include: {
                citations: { include: { chunk: { include: { source: { select: { id: true, title: true } } } } } },
            },
        });
        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "ساخت پیش‌نویس کوروش ناموفق بود.";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
