import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const item = await db.calendarItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "آیتم تقویم پیدا نشد." }, { status: 404 });
    if (item.planItemId) return NextResponse.json({ error: "این آیتم قبلاً به برنامه اضافه شده است." }, { status: 409 });
    const result = await db.$transaction(async transaction => {
        const planItem = await transaction.planItem.create({
            data: {
                topic: item.topic, publishDate: item.date,
                type: item.format, tone: "فارسی روان و مستند",
                notes: `${item.hook}\nهدف: ${item.goal}\n${item.occasion ? `مناسبت: ${item.occasion}` : ""}`,
                status: "PLANNED",
            },
        });
        const updated = await transaction.calendarItem.update({ where: { id }, data: { planItemId: planItem.id, status: "DRAFT" } });
        return { item: updated, planItem };
    });
    return NextResponse.json(result, { status: 201 });
}
