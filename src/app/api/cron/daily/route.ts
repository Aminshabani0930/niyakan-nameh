import { db } from "@/lib/db";
import { dayRange } from "@/lib/time";
import { sendTelegram } from "@/lib/telegram";
import { NextResponse } from "next/server";

const fa = (d: Date) => d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new NextResponse("Unauthorized", { status: 401 });

  const todays = await db.contentItem.findMany({ where: { publishDate: dayRange(0, 1) } });
  const toRecord = await db.contentItem.findMany({
    where: { status: { in: ["IDEA", "TO_RECORD"] }, recordDate: dayRange(0, 3) },
    orderBy: { recordDate: "asc" },
  });

  const line = (i: { format: string; title: string }) => `• [${i.format}] ${i.title}`;
  const message =
    `📅 امروز منتشر کنید:\n${todays.map(i => line(i)).join("\n") || "چیزی نیست"}\n\n` +
    `🎬 ضبط امروز و ۲ روز آینده:\n${toRecord.map(i =>
      `${line(i)}${i.recordDate ? ` (ضبط: ${fa(i.recordDate)})` : ""}`
    ).join("\n") || "چیزی نیست"}`;

  if (todays.length || toRecord.length) {
    try { await sendTelegram(message); } catch (e: any) {
      return NextResponse.json({ message, telegramError: e.message }, { status: 502 });
    }
  }
  return NextResponse.json({ message });
}
