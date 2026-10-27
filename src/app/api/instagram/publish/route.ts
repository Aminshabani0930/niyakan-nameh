import { db } from "@/lib/db";
import { publish } from "@/lib/instagram";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const { id } = await req.json();
  const item = await db.contentItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  if (item.status === "PUBLISHED") return NextResponse.json({ error: "قبلاً منتشر شده" }, { status: 409 });
  if (!item.mediaUrl) return NextResponse.json({ error: "ابتدا فایل را آپلود کنید" }, { status: 400 });
  try {
    const r = await publish(item.format as any, item.mediaUrl, item.caption);
    await db.contentItem.update({ where: { id }, data: { status: "PUBLISHED", igMediaId: r.id } });
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
