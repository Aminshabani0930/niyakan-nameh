import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { extractSourceText, normalizePersianText, removeRepeatedHeadersAndPageNumbers, repairRtlWordOrder, SourceImportError, SOURCE_MAX_BYTES, sourceChunkTitle, splitSourceText } from "@/lib/source-library";

export const runtime = "nodejs";
export const maxDuration = 120;

const sourceTypes = ["SHAHNAMEH", "HISTORY", "ARCHITECTURE", "CYRUS", "OTHER"] as const;
const periods = ["MYTHICAL", "ACHAEMENID", "PARTHIAN", "SASANIAN", "ISLAMIC", "SAFAVID", "AFSHARID", "ZAND", "QAJAR"] as const;

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return NextResponse.json({ error: "فایل منبع انتخاب نشده است." }, { status: 400 });
        if (file.size > SOURCE_MAX_BYTES) return NextResponse.json({ error: "حجم هر فایل حداکثر ۵ مگابایت است؛ فایل بزرگ‌تر را از پوشه‌ی data/ وارد کنید." }, { status: 413 });
        const title = String(form.get("title") ?? "").trim();
        const license = String(form.get("license") ?? "").trim();
        const type = String(form.get("type") ?? "OTHER");
        if (!title || !license) return NextResponse.json({ error: "نام منبع و مجوز الزامی است." }, { status: 400 });
        if (!sourceTypes.includes(type as typeof sourceTypes[number])) return NextResponse.json({ error: "نوع منبع معتبر نیست." }, { status: 400 });
        const periodValue = String(form.get("period") ?? "");
        const period = periods.includes(periodValue as typeof periods[number]) ? periodValue : null;
        const buffer = Buffer.from(await file.arrayBuffer());
        let text = await extractSourceText(buffer, file.name);
        if (form.get("repairRtl") === "true") text = repairRtlWordOrder(text);
        if (form.get("removeHeaders") === "true") text = removeRepeatedHeadersAndPageNumbers(text);
        text = text.trim();
        if (!text) return NextResponse.json({ error: "متنی برای ذخیره پیدا نشد؛ PDF اسکن است، OCR لازم است." }, { status: 422 });
        const chunks = splitSourceText(text);
        const isPreview = form.get("preview") === "true";
        if (isPreview) {
            return NextResponse.json({
                preview: chunks.slice(0, 3).map((chunk, index) => ({ sequence: index + 1, title: sourceChunkTitle(chunk), text: chunk.slice(0, 2_500) })),
                chunkCount: chunks.length,
                wordCount: text.match(/\S+/g)?.length ?? 0,
                byteCount: file.size,
            });
        }
        const contentHash = createHash("sha256").update(buffer).digest("hex");
        const duplicate = await db.source.findUnique({ where: { contentHash }, select: { id: true, title: true } });
        if (duplicate) return NextResponse.json({ error: `این فایل قبلاً با عنوان «${duplicate.title}» وارد شده است.` }, { status: 409 });
        const source = await db.$transaction(async transaction => {
            const created = await transaction.source.create({
                data: {
                    title, license, type: type as typeof sourceTypes[number], contentHash,
                    authorEditor: String(form.get("authorEditor") ?? "").slice(0, 300),
                    yearEdition: String(form.get("yearEdition") ?? "").slice(0, 120),
                    sourceUrl: String(form.get("sourceUrl") ?? "").slice(0, 2_000),
                    notes: String(form.get("notes") ?? "").slice(0, 5_000),
                    period: period as typeof periods[number] | null,
                },
            });
            for (let offset = 0; offset < chunks.length; offset += 50) {
                await transaction.sourceChunk.createMany({
                    data: chunks.slice(offset, offset + 50).map((chunk, index) => ({
                        sourceId: created.id,
                        sequence: offset + index + 1,
                        title: sourceChunkTitle(chunk),
                        text: chunk,
                        normalizedText: normalizePersianText(chunk),
                        period: period as typeof periods[number] | null,
                    })),
                });
            }
            return created;
        });
        return NextResponse.json({ source, chunks: chunks.length, words: text.match(/\S+/g)?.length ?? 0 }, { status: 201 });
    } catch (error) {
        if (error instanceof SourceImportError) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ error: "ورود منبع ناموفق بود؛ فایل را بررسی و دوباره تلاش کنید." }, { status: 500 });
    }
}
