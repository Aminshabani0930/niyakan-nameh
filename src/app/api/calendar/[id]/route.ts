import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const parsed = z.object({ status: z.enum(["SUGGESTED", "DRAFT", "APPROVED"]) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "وضعیت تقویم معتبر نیست." }, { status: 400 });
    const existing = await db.calendarItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "آیتم تقویم پیدا نشد." }, { status: 404 });
    if (parsed.data.status === "APPROVED" && existing.status !== "DRAFT") return NextResponse.json({ error: "فقط پیش‌نویس را می‌توان تأیید کرد." }, { status: 409 });
    return NextResponse.json(await db.calendarItem.update({ where: { id }, data: { status: parsed.data.status } }));
}
