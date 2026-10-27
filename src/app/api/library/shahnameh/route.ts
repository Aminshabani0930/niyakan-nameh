import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const storyId = new URL(req.url).searchParams.get("story");
    const stories = await db.shahnamehStory.findMany({
        where: storyId ? { id: storyId } : undefined,
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: { verses: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ loaded: stories.length > 0, stories });
}
