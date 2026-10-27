import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
    const deny = await requireAuth();
    if (deny) return deny;
    const items = await db.contentItem.findMany({
        where: {
            status: "PUBLISHED", OR: [
                { title: { contains: "کوروش" } }, { caption: { contains: "کوروش" } }, { script: { contains: "کوروش" } },
            ]
        },
        orderBy: { publishDate: "desc" }, take: 100,
        select: { id: true, title: true, caption: true, publishDate: true, igMediaId: true, mediaUrl: true, format: true },
    });
    return NextResponse.json(items);
}
