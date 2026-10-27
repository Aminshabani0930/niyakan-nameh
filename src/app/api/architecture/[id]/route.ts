import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const entry = await db.architectureEntry.findUnique({
        where: { id },
        include: { sources: { include: { source: { select: { id: true, title: true, type: true } } } } },
    });
    if (!entry || entry.status !== "APPROVED") return NextResponse.json({ error: "مورد معماری تأییدشده پیدا نشد." }, { status: 404 });
    return NextResponse.json(entry);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const parsed = z.object({
        name: z.string().trim().min(1).max(300).optional(),
        period: z.string().trim().min(1).max(120).optional(),
        cityProvince: z.string().max(200).optional(),
        style: z.string().max(200).optional(),
        features: z.array(z.string().max(500)).max(30).optional(),
        status: z.enum(["NEEDS_REVIEW", "APPROVED"]).optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "اطلاعات معماری معتبر نیست." }, { status: 400 });
    const entry = await db.architectureEntry.findUnique({ where: { id }, include: { sources: true } });
    if (!entry) return NextResponse.json({ error: "مورد معماری پیدا نشد." }, { status: 404 });
    if (parsed.data.status === "APPROVED" && entry.sources.length === 0) {
        return NextResponse.json({ error: "برای تأیید، دست‌کم یک منبع ثبت کنید." }, { status: 409 });
    }
    return NextResponse.json(await db.architectureEntry.update({ where: { id }, data: parsed.data }));
}
