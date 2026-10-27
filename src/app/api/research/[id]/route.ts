import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const deny = await requireAuth();
    if (deny) return deny;
    const { id } = await params;
    const parsed = z.object({ title: z.string().trim().min(1).max(300).optional(), text: z.string().trim().min(1).max(20_000).optional(), status: z.enum(["NEEDS_REVIEW", "APPROVED", "REJECTED"]).optional() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "اطلاعات مطلب معتبر نیست." }, { status: 400 });
    const entry = await db.researchEntry.findUnique({ where: { id }, include: { citations: true } });
    if (!entry) return NextResponse.json({ error: "مطلب پژوهشی پیدا نشد." }, { status: 404 });
    if (parsed.data.status === "APPROVED" && (!entry.autoReviewPassed || entry.citations.length === 0 || parsed.data.text !== undefined || parsed.data.title !== undefined)) {
        return NextResponse.json({ error: "برای تأیید، ارجاع معتبر لازم است؛ متن ویرایش‌شده را دوباره بازبینی خودکار کنید." }, { status: 409 });
    }
    return NextResponse.json(await db.researchEntry.update({ where: { id }, data: parsed.data }));
}
