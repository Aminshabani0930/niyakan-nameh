import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const entry = await db.cyrusEntry.findUnique({
        where: { id, status: "APPROVED" },
        include: {
            citations: { include: { chunk: { include: { source: { select: { id: true, title: true } } } } } },
        },
    });
    if (!entry) return NextResponse.json({ error: "مدخل تأییدشده پیدا نشد." }, { status: 404 });
    return NextResponse.json(entry);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const parsed = z.object({
        title: z.string().trim().min(1).max(300).optional(),
        text: z.string().trim().min(1).max(20_000).optional(),
        status: z.enum(["NEEDS_REVIEW", "APPROVED", "REJECTED"]).optional(),
        order: z.number().int().optional(),
        imageUrl: z.string().url().nullable().optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "اطلاعات مدخل معتبر نیست." }, { status: 400 });
    const current = await db.cyrusEntry.findUnique({ where: { id }, include: { citations: true } });
    if (!current) return NextResponse.json({ error: "مدخل پیدا نشد." }, { status: 404 });
    if (parsed.data.status === "APPROVED" && current.citations.length === 0) {
        return NextResponse.json({ error: "برای تأیید، دست‌کم یک ارجاع معتبر به منبع کوروش اضافه کنید." }, { status: 409 });
    }
    return NextResponse.json(await db.cyrusEntry.update({ where: { id }, data: parsed.data }));
}
