import { db } from "@/lib/db";
import { generatePlanItem } from "@/lib/plan-item-agent";
import { aiErrorMessage } from "@/lib/ai";
import { sendTelegram } from "@/lib/telegram";
import { getSettingsOrDefault } from "@/lib/settings";
import { dayKey } from "@/lib/calendar";
import { NextResponse } from "next/server";

export const maxDuration = 300;

function unauthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") !== `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (unauthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const settings = await getSettingsOrDefault();
  const now = new Date();
  const tehranTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  let digestNotified = false;
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && tehranTime === settings.digestTime) {
    const today = new Date(`${dayKey(now)}T00:00:00+03:30`);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const afterTomorrow = new Date(tomorrow.getTime() + 86_400_000);
    const [todayItems, tomorrowItems] = await Promise.all([
      db.calendarItem.findMany({ where: { date: { gte: today, lt: tomorrow } }, orderBy: { time: "asc" }, take: 12 }),
      db.calendarItem.findMany({ where: { date: { gte: tomorrow, lt: afterTomorrow } }, orderBy: { time: "asc" }, take: 12 }),
    ]);
    const formatLine = (items: typeof todayItems) => items.length
      ? items.map(item => `• ${item.time} ${item.topic} (${item.format})`).join("\n")
      : "تقویم هنوز برای این روز ساخته نشده است.";
    try {
      await sendTelegram(["نیاکان‌نامه | پیشنهاد انتشار امروز", formatLine(todayItems), "", "پیشنهاد فردا", formatLine(tomorrowItems), "", "این‌ها پیشنهادند؛ انتشار فقط با تأیید دستی انجام می‌شود."].join("\n"));
      digestNotified = true;
    } catch { digestNotified = false; }
  }

  const dueBy = new Date(now.getTime() + 3 * 86_400_000);
  const pending = await db.planItem.findMany({
    where: { status: "PLANNED", publishDate: { gte: now, lte: dueBy } },
    orderBy: { publishDate: "asc" },
    take: 20,
  });

  const results: { topic: string; ok: boolean; message: string }[] = [];
  for (const item of pending) {
    try {
      const generated = await generatePlanItem(item.id);
      results.push({
        topic: item.topic,
        ok: true,
        message: generated.errorMessage ?? "پیش‌نویس ساخته شد؛ انتشار نیازمند تأیید دستی است.",
      });
    } catch (error) {
      results.push({
        topic: item.topic,
        ok: false,
        message: aiErrorMessage(error),
      });
    }
  }

  let telegramNotified = false;
  if (results.length && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const message = [
      "گزارش ایجنت برنامه‌ی نیاکان‌نامه",
      ...results.map(result => `${result.ok ? "✅" : "⚠️"} ${result.topic.slice(0, 80)}: ${result.ok ? "پیش‌نویس ساخته شد؛ انتشار فقط با تأیید دستی." : "تولید ناموفق؛ از صفحه‌ی ایجنت بررسی کنید."}`),
      "هیچ محتوایی خودکار منتشر نشده است.",
    ].join("\n");
    try {
      await sendTelegram(message);
      telegramNotified = true;
    } catch {
      telegramNotified = false;
    }
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    telegramNotified,
    digestNotified,
  });
}
