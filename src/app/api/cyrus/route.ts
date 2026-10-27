import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const sections = ["BIOGRAPHY", "TIMELINE", "CONQUESTS", "CYRUS_CYLINDER", "PASARGADAE", "SOURCES", "LATER_TRADITIONS", "GALLERY", "Q_AND_A"] as const;

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const params = new URL(req.url).searchParams;
    const all = params.get("all") === "true";
    const section = params.get("section");
    const entries = await db.cyrusEntry.findMany({
        where: { ...(all ? {} : { status: "APPROVED" }), ...(sections.includes(section as typeof sections[number]) ? { section: section as typeof sections[number] } : {}) },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: {
            citations: { include: { chunk: { include: { source: { select: { id: true, title: true, type: true } } } } } },
        },
    });
    return NextResponse.json(entries);
}

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = z.object({
        section: z.enum(sections), title: z.string().trim().min(1).max(300), text: z.string().trim().min(1).max(20_000),
        order: z.number().int().default(0), imageUrl: z.string().url().optional(), chunkIds: z.array(z.string()).max(20).default([]),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "عنوان، متن و بخش معتبر لازم است." }, { status: 400 });
    const { chunkIds, ...data } = parsed.data;
    if (chunkIds.length) {
        const count = await db.sourceChunk.count({ where: { id: { in: chunkIds }, source: { type: "CYRUS" } } });
        if (count !== chunkIds.length) return NextResponse.json({ error: "ارجاع باید به بخش موجود از منبع نوع کوروش باشد." }, { status: 400 });
    }
    const entry = await db.cyrusEntry.create({ data: { ...data, status: "NEEDS_REVIEW", citations: { create: chunkIds.map(chunkId => ({ chunkId })) } } });
    return NextResponse.json(entry, { status: 201 });
}
