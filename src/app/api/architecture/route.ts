import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const Body = z.object({
    name: z.string().trim().min(1).max(300),
    period: z.string().trim().min(1).max(120),
    cityProvince: z.string().max(200).optional(),
    style: z.string().max(200).optional(),
    features: z.array(z.string().max(500)).max(30).default([]),
    sourceIds: z.array(z.string()).min(1, "حداقل یک منبع لازم است.").max(20),
});

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const approvedOnly = new URL(req.url).searchParams.get("all") !== "true";
    const entries = await db.architectureEntry.findMany({
        where: approvedOnly ? { status: "APPROVED" } : undefined,
        orderBy: [{ period: "asc" }, { name: "asc" }],
        include: { sources: { include: { source: { select: { id: true, title: true, type: true } } } } },
    });
    return NextResponse.json(entries);
}

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "نام، دوره، و دست‌کم یک منبع معتبر لازم است." }, { status: 400 });
    const { sourceIds, ...data } = parsed.data;
    const count = await db.source.count({ where: { id: { in: sourceIds } } });
    if (count !== sourceIds.length) return NextResponse.json({ error: "یکی از منابع انتخاب‌شده پیدا نشد." }, { status: 400 });
    const entry = await db.architectureEntry.create({
        data: { ...data, sources: { create: sourceIds.map(sourceId => ({ sourceId })) } },
    });
    return NextResponse.json(entry, { status: 201 });
}
