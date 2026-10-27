import { db } from "@/lib/db";
import { postInsights, accountInsights } from "@/lib/instagram";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const published = await db.contentItem.findMany({
    where: { status: "PUBLISHED", igMediaId: { not: null } },
    orderBy: { publishDate: "desc" }, take: 20,
  });

  const rows = await Promise.all(published.map(async item => {
    const row = { id: item.id, title: item.title, format: item.format, category: item.category,
      reach: 0, likes: 0, comments: 0, saved: 0, shares: 0, interactions: 0 };
    try {
      const res = await postInsights(item.igMediaId!, item.format);
      for (const m of res.data ?? []) {
        const v = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
        if (m.name === "reach") row.reach = v;
        if (m.name === "likes") row.likes = v;
        if (m.name === "comments") row.comments = v;
        if (m.name === "saved") row.saved = v;
        if (m.name === "shares") row.shares = v;
        if (m.name === "total_interactions") row.interactions = v;
      }
      return row;
    } catch (error) {
      return {
        ...row,
        error: error instanceof Error ? error.message : "دریافت آمار این محتوا ناموفق بود",
      };
    }
  }));

  let account = null;
  let accountError: string | null = null;
  try {
    account = await accountInsights();
  } catch (error) {
    accountError = error instanceof Error ? error.message : "دریافت آمار حساب ناموفق بود";
  }
  return NextResponse.json({ rows, account, accountError });
}
