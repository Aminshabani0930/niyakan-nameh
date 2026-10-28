import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildCalendar, getCalendarItems } from "@/lib/calendar";

export async function GET(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const date = new URL(req.url).searchParams.get("date") ?? undefined;
    return NextResponse.json({ items: await getCalendarItems(date) });
}

export async function POST(req: Request) {
    const deny = await requireAuth();
    if (deny) return deny;
    const parsed = z.object({ action: z.enum(["build", "rebuild-day"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "درخواست تقویم معتبر نیست." }, { status: 400 });
    if (parsed.data.action === "rebuild-day" && !parsed.data.date) return NextResponse.json({ error: "تاریخ روز برای بازسازی الزامی است." }, { status: 400 });
    try {
        const result = await buildCalendar(parsed.data.action === "rebuild-day" ? { onlyDate: parsed.data.date } : { startDate: parsed.data.date });
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "ساخت تقویم ناموفق بود." }, { status: 400 });
    }
}
