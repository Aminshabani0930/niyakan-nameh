import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const Update = z.object({
  topic: z.string().trim().min(1).max(500).optional(),
  publishDate: z.string().datetime().optional(),
  type: z.enum(["POST", "CAROUSEL", "REEL", "STORY"]).optional(),
  tone: z.string().trim().min(1).max(100).optional(),
  notes: z.string().max(2_000).optional(),
  status: z.enum(["PLANNED", "APPROVED"]).optional(),
});

export async function PATCH(req: Request, { params }: Context) {
  const deny = await requireAuth();
  if (deny) return deny;
  const parsed = Update.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "اطلاعات برنامه معتبر نیست." }, { status: 400 });
  const { id } = await params;
  const existing = await db.planItem.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "آیتم برنامه پیدا نشد." }, { status: 404 });
  if (parsed.data.status === "APPROVED" && existing.status !== "DRAFT") {
    return NextResponse.json({ error: "فقط پیش‌نویس را می‌توان تأیید کرد." }, { status: 409 });
  }
  if (parsed.data.status === "PLANNED" && existing.status !== "FAILED") {
    return NextResponse.json({ error: "فقط آیتم ناموفق را می‌توان دوباره برنامه‌ریزی کرد." }, { status: 409 });
  }
  const editingFields = ["topic", "publishDate", "type", "tone", "notes"] as const;
  if (editingFields.some(key => parsed.data[key] !== undefined)
    && existing.status !== "PLANNED" && existing.status !== "FAILED") {
    return NextResponse.json({ error: "فقط آیتم برنامه‌ریزی‌شده یا ناموفق قابل ویرایش است." }, { status: 409 });
  }
  const data = {
    ...parsed.data,
    ...(parsed.data.publishDate ? { publishDate: new Date(parsed.data.publishDate) } : {}),
    ...(parsed.data.status === "PLANNED" ? { errorMessage: null } : {}),
  };
  return NextResponse.json(await db.planItem.update({ where: { id }, data }));
}

export async function DELETE(_req: Request, { params }: Context) {
  const deny = await requireAuth();
  if (deny) return deny;
  const { id } = await params;
  const existing = await db.planItem.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "آیتم برنامه پیدا نشد." }, { status: 404 });
  if (existing.status === "GENERATING") {
    return NextResponse.json({ error: "آیتم در حال تولید است و اکنون حذف نمی‌شود." }, { status: 409 });
  }
  return NextResponse.json(await db.planItem.delete({ where: { id } }));
}
