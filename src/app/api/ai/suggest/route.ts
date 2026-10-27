import { db } from "@/lib/db";
import { suggestContent } from "@/lib/ai";
import { requireAuth } from "@/lib/auth";
import { CATEGORIES, FORMATS } from "@/lib/categories";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestBody = z.object({
  category: z.string().refine(value => CATEGORIES.some(category => category.key === value)),
  format: z.enum(FORMATS),
  count: z.number().int().min(1).max(10).default(5),
});

export async function POST(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const parsed = RequestBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { category, format, count } = parsed.data;
    const existing = await db.contentItem.findMany({ where: { category }, select: { title: true } });
    const items = await suggestContent({
      category, format, count, existingTitles: existing.map(e => e.title),
    });
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای نامشخص در پیشنهاد محتوا";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
