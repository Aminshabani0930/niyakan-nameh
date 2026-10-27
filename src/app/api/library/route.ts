import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const SourceBody = z.object({
    title: z.string().trim().min(1, "نام منبع الزامی است.").max(300),
    authorEditor: z.string().max(300).optional(),
    type: z.enum(["SHAHNAMEH", "HISTORY", "ARCHITECTURE", "CYRUS", "OTHER"]),
    yearEdition: z.string().max(120).optional(),
    license: z.string().trim().min(1, "مجوز منبع الزامی است.").max(300),
    sourceUrl: z.string().url().or(z.literal("")).optional(),
    notes: z.string().max(5_000).optional(),
    period: z.enum(["MYTHICAL", "ACHAEMENID", "PARTHIAN", "SASANIAN", "ISLAMIC", "SAFAVID", "AFSHARID", "ZAND", "QAJAR"]).nullable().optional(),
});

export async function GET() {
    const deny = await requireAuth();
    if (deny) return deny;
    const sources = await db.source.findMany({
        orderBy: { uploadedAt: "desc" },
        include: { _count: { select: { chunks: true } } },
    });
    return NextResponse.json(sources);
}

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = SourceBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "نام منبع و مجوز الزامی است؛ اطلاعات دیگر را بررسی کنید." }, { status: 400 });
    const source = await db.source.create({ data: parsed.data });
    return NextResponse.json(source, { status: 201 });
}
