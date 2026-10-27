import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ImportedItem = z.object({
  topic: z.string().trim().min(1).max(500),
  publishDate: z.string().datetime(),
  type: z.enum(["POST", "CAROUSEL", "REEL"]).default("POST"),
  tone: z.string().trim().min(1).max(100).default("روان و صمیمی"),
  notes: z.string().max(2_000).default(""),
});

export async function POST(req: Request) {
  const deny = await requireAuth();
  if (deny) return deny;
  const parsed = z.object({ items: z.array(ImportedItem).min(1).max(100) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "فهرست واردشده معتبر نیست؛ حداکثر ۱۰۰ مورد مجاز است." }, { status: 400 });
  }
  const items = await db.planItem.createMany({
    data: parsed.data.items.map(item => ({ ...item, publishDate: new Date(item.publishDate) })),
  });
  return NextResponse.json({ created: items.count }, { status: 201 });
}
