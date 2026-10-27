import { db } from "./db";
import { dayRange, fa } from "./time";
import { FORMAT_FA } from "./categories";

const line = (i: { format: string; title: string; publishDate: Date; recordDate: Date | null }, includeDate = false) => {
  const format = Object.entries(FORMAT_FA).find(([key]) => key === i.format)?.[1] ?? i.format;
  return `• [${format}] ${i.title}${includeDate && i.recordDate ? ` (ضبط: ${fa(i.recordDate)})` : ""}`;
};

export async function buildDigest() {
  const [todays, toRecord] = await Promise.all([
    db.contentItem.findMany({
      where: { publishDate: dayRange(0, 1), status: { not: "PUBLISHED" } },
      orderBy: { publishDate: "asc" },
    }),
    db.contentItem.findMany({
      where: { status: { in: ["IDEA", "TO_RECORD"] }, recordDate: dayRange(0, 3) },
      orderBy: { recordDate: "asc" },
    }),
  ]);
  const message =
    `📅 امروز منتشر کنید:\n${todays.map(i => line(i)).join("\n") || "چیزی نیست"}\n\n` +
    `🎬 ضبط امروز و ۲ روز آینده:\n${toRecord.map(i => line(i, true)).join("\n") || "چیزی نیست"}`;
  return { todays, toRecord, message };
}
