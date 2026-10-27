import { NextResponse } from "next/server";
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const Verse = z.object({
    storyTitle: z.string().trim().min(1).max(300),
    storyOrder: z.coerce.number().int().min(0),
    verseOrder: z.coerce.number().int().min(1),
    firstHemistich: z.string().trim().min(1).max(2_000),
    secondHemistich: z.string().trim().min(1).max(2_000),
});

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File) || file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "فایل JSON یا CSV حداکثر ۵ مگابایت انتخاب کنید." }, { status: 400 });
        }
        const extension = file.name.toLowerCase().split(".").pop();
        const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
        let rows: unknown;
        if (extension === "json") rows = JSON.parse(text);
        else if (extension === "csv") rows = parseCsv(text, { columns: true, skip_empty_lines: true, bom: true });
        else return NextResponse.json({ error: "فقط JSON و CSV پشتیبانی می‌شود." }, { status: 400 });
        if (!Array.isArray(rows) || rows.length === 0 || rows.length > 5_000) {
            return NextResponse.json({ error: "فایل باید ۱ تا ۵۰۰۰ بیت داشته باشد." }, { status: 400 });
        }
        const parsed = z.array(Verse).safeParse(rows);
        if (!parsed.success) return NextResponse.json({ error: "ستون‌های فایل معتبر نیستند؛ قالب را در راهنمای داده ببینید." }, { status: 400 });
        let created = 0;
        for (let offset = 0; offset < parsed.data.length; offset += 100) {
            const batch = parsed.data.slice(offset, offset + 100);
            await db.$transaction(async transaction => {
                const storyKeys = new Map<string, { title: string; order: number }>();
                for (const verse of batch) storyKeys.set(`${verse.storyTitle}:${verse.storyOrder}`, { title: verse.storyTitle, order: verse.storyOrder });
                for (const storyData of storyKeys.values()) {
                    await transaction.shahnamehStory.upsert({
                        where: { title_order: storyData },
                        update: {},
                        create: storyData,
                    });
                }
                for (const verse of batch) {
                    const story = await transaction.shahnamehStory.findUniqueOrThrow({ where: { title_order: { title: verse.storyTitle, order: verse.storyOrder } } });
                    const existing = await transaction.shahnamehVerse.findUnique({ where: { storyId_order: { storyId: story.id, order: verse.verseOrder } } });
                    if (existing) {
                        await transaction.shahnamehVerse.update({ where: { id: existing.id }, data: { firstHemistich: verse.firstHemistich, secondHemistich: verse.secondHemistich } });
                    } else {
                        await transaction.shahnamehVerse.create({ data: { storyId: story.id, order: verse.verseOrder, firstHemistich: verse.firstHemistich, secondHemistich: verse.secondHemistich } });
                        created++;
                    }
                }
            });
        }
        return NextResponse.json({ created, total: parsed.data.length, message: `${parsed.data.length} بیت پردازش شد.` });
    } catch {
        return NextResponse.json({ error: "ورود فایل شاهنامه ناموفق بود؛ JSON یا CSV را بررسی کنید." }, { status: 400 });
    }
}
