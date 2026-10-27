import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getResearchTopics } from "@/lib/research";

export async function GET() {
    const deny = await requireAuth();
    if (deny) return deny;
    try { return NextResponse.json(await getResearchTopics()); }
    catch { return NextResponse.json({ error: "فایل data/topics.json معتبر نیست." }, { status: 500 }); }
}
