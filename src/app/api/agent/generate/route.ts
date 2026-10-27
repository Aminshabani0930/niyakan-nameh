import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generatePlanItem } from "@/lib/plan-item-agent";
import { aiErrorMessage } from "@/lib/ai";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const Body = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ futureWeek: z.literal(true) }),
]);

export async function POST(req: Request) {
  const deny = await requireAuth();
  if (deny) return deny;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "درخواست تولید معتبر نیست." }, { status: 400 });

  let items: { id: string }[];
  if ("id" in parsed.data) {
    const item = await db.planItem.findUnique({ where: { id: parsed.data.id } });
    if (!item) return NextResponse.json({ error: "آیتم برنامه پیدا نشد." }, { status: 404 });
    items = [item];
  } else {
    items = await db.planItem.findMany({
        where: {
          status: { in: ["PLANNED", "FAILED"] },
          publishDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) },
        },
        orderBy: { publishDate: "asc" },
        take: 20,
      });
  }

  const results: { id: string; ok: boolean; message?: string }[] = [];
  for (const item of items) {
    try {
      await generatePlanItem(item.id);
      results.push({ id: item.id, ok: true });
    } catch (error) {
      results.push({
        id: item.id,
        ok: false,
        message: aiErrorMessage(error),
      });
    }
  }
  return NextResponse.json({ results });
}
