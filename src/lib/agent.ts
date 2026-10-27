import { addDays } from "date-fns";
import { CATEGORY_KEYS, type Format } from "./categories";
import { db } from "./db";
import { suggestPlan } from "./ai";
import { getSettings } from "./settings";
import { dayStart } from "./time";

const TZ = "Asia/Tehran";

const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: TZ });

function formatForMix(mix: string, index: number): Format {
  if (mix === "SINGLE") return "POST";
  if (mix === "CAROUSEL") return "CAROUSEL";
  if (mix === "REEL") return "REEL";
  const cycle: Format[] = ["POST", "REEL", "CAROUSEL", "POST"];
  return cycle[index % cycle.length];
}

/** تاریخ‌های خالی را از فردا به بعد، به‌صورت یکنواخت در بازه پخش می‌کند. */
function targetDates(days: number, postsPerWeek: number) {
  const all = Array.from({ length: days }, (_, index) => addDays(dayStart(1), index));
  const wanted = Math.max(1, Math.min(all.length, Math.round((days / 7) * postsPerWeek)));
  const indexes = new Set<number>();
  for (let i = 0; i < wanted; i++) {
    indexes.add(Math.min(all.length - 1, Math.round((i * all.length) / wanted)));
  }
  for (let i = 0; indexes.size < wanted && i < all.length; i++) indexes.add(i);
  return [...indexes].sort((a, b) => a - b).map(index => all[index]);
}

export type AgentRunResult = {
  created: number;
  skipped: number;
  images: number;
  imageErrors: number;
  dates: string[];
  errors: string[];
};

export async function runAgent(options: {
  days?: number;
  withImages?: boolean;
} = {}): Promise<AgentRunResult> {
  const settings = await getSettings();
  const days = Math.max(1, Math.min(30, Math.round(options.days ?? 7)));
  const withImages = options.withImages !== false;

  const wantedDates = targetDates(days, settings.postsPerWeek);
  const rangeStart = wantedDates[0];
  const rangeEnd = addDays(wantedDates[wantedDates.length - 1], 1);

  const existing = await db.contentItem.findMany({
    where: { publishDate: { gte: rangeStart, lt: rangeEnd } },
    select: { publishDate: true, title: true },
  });
  const occupied = new Set(existing.map(item => dayKey(item.publishDate)));
  const freeDates = wantedDates.filter(date => !occupied.has(dayKey(date)));

  const slots = freeDates.slice(0, 10).map((date, index) => ({
    date,
    category: CATEGORY_KEYS[(index + Math.floor(date.getTime() / 86_400_000)) % CATEGORY_KEYS.length],
    format: formatForMix(settings.postMix, index),
  }));

  const result: AgentRunResult = {
    created: 0,
    skipped: wantedDates.length - slots.length,
    images: 0,
    imageErrors: 0,
    dates: slots.map(slot => dayKey(slot.date)),
    errors: [],
  };

  if (slots.length > 0) {
    const suggestions = await suggestPlan({
      slots: slots.map(slot => ({ category: slot.category, format: slot.format })),
      existingTitles: existing.map(item => item.title),
      imageStyle: settings.imageStyle,
      carouselSlides: settings.carouselSlides,
      generateImages: withImages && !!process.env.AI_IMAGE_MODEL,
      maxImages: Math.max(0, Number(process.env.AGENT_MAX_IMAGES_PER_RUN || 6)),
    });

    const writes = suggestions.map((suggestion, index) => {
      const publishDate = slots[index].date;
      return db.contentItem.create({
        data: {
          title: suggestion.title,
          caption: [suggestion.caption, suggestion.hashtags.join(" ")].filter(Boolean).join("\n\n"),
          script: suggestion.slides.length
            ? suggestion.slides.map((slide, slideIndex) => `${slideIndex + 1}. ${slide}`).join("\n\n")
            : suggestion.script,
          category: suggestion.category,
          format: suggestion.format,
          status: "IDEA",
          publishDate,
          recordDate: addDays(publishDate, -2),
          mediaUrl: suggestion.imageUrl,
          mediaUrls: suggestion.imageUrls,
          source: "AGENT",
          imageError: suggestion.imageError,
        },
      });
    });

    const created = await db.$transaction(writes);
    result.created = created.length;
    result.images = suggestions.reduce((count, item) => count + item.imageUrls.length, 0);
    result.imageErrors = suggestions.filter(item => item.imageError).length;
  }

  return result;
}
