import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const all = new URL(req.url).searchParams.get("all") === "true";
    const entries = await db.researchEntry.findMany({
        where: all ? {} : { status: "APPROVED" },
        orderBy: { createdAt: "desc" }, take: 100,
        include: { citations: { include: { chunk: { include: { source: { select: { id: true, title: true } } } } } }, instagramDrafts: true },
    });
    return NextResponse.json(entries);
}

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
    if (!entry || !entry.citations.length) return NextResponse.json({ error: "فقط مطلب تأییدشده با ارجاع معتبر قابل تبدیل به پیش‌نویس است." }, { status: 409 });
    return NextResponse.json({ entry });
}
