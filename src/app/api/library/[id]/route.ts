import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const source = await db.source.findUnique({
        where: { id },
        include: { chunks: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, title: true, text: true, chapterPage: true } } },
    });
    if (!source) return NextResponse.json({ error: "منبع پیدا نشد." }, { status: 404 });
    return NextResponse.json(source);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const exists = await db.source.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "منبع پیدا نشد." }, { status: 404 });
    await db.source.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
}
