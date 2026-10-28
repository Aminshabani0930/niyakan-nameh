import { addDays } from "date-fns";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountInsights, postInsights } from "@/lib/instagram";
import { DEFAULT_SETTINGS, getSettingsOrDefault } from "@/lib/settings";

const TZ = "Asia/Tehran";
const topicsFile = z.array(z.object({ id: z.string(), title: z.string(), period: z.string().default(""), queries: z.array(z.string()) }));
const occasionsFile = z.array(z.object({ date: z.string().regex(/^\d{2}-\d{2}$/), title: z.string(), source: z.string() }));
const categories = ["shahnameh", "kings", "ancient-iran", "culture", "achievements", "ancient-iran"];
const goals = ["ATTRACT", "ENGAGE", "SAVE", "SHARE"] as const;
const periods = ["MORNING", "NOON", "AFTERNOON", "NIGHT"] as const;

export const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: TZ });

function tehranDate(date: Date) {
    return new Date(`${dayKey(date)}T00:00:00+03:30`);
}

async function getTopics() {
    const value = JSON.parse(await readFile(path.join(process.cwd(), "data", "topics.json"), "utf8"));
    return topicsFile.parse(value);
}

async function getOccasions() {
    const value = JSON.parse(await readFile(path.join(process.cwd(), "data", "occasions.json"), "utf8"));
    return occasionsFile.parse(value);
}

async function performanceHints() {
    if (!process.env.IG_USER_ID || !process.env.IG_ACCESS_TOKEN) return { bestFormat: null as string | null, bestHour: null as string | null, tag: "بدون داده‌ی آماری" };
    try {
        const [posts, account] = await Promise.all([
            db.contentItem.findMany({ where: { status: "PUBLISHED", igMediaId: { not: null } }, orderBy: { publishDate: "desc" }, take: 6, select: { format: true, igMediaId: true, publishDate: true } }),
            accountInsights(),
        ]);
        if (!posts.length || !account) return { bestFormat: null, bestHour: null, tag: "بدون داده‌ی آماری" };
        const summaries = await Promise.all(posts.map(async post => {
            try {
                const response = await postInsights(post.igMediaId!, post.format);
                const metrics = Array.isArray(response.data) ? response.data as { values?: { value?: number }[]; total_value?: { value?: number } }[] : [];
                const interactions = metrics.reduce((total: number, metric) => total + Number(metric.values?.[0]?.value ?? metric.total_value?.value ?? 0), 0);
                const hour = new Date(post.publishDate).toLocaleTimeString("en-GB", { hour: "2-digit", timeZone: TZ });
                return { format: post.format, hour: `${hour}:00`, interactions };
            } catch { return null; }
        }));
        const valid = summaries.filter((item): item is NonNullable<typeof item> => Boolean(item && item.interactions > 0));
        if (!valid.length) return { bestFormat: null, bestHour: null, tag: "بدون داده‌ی آماری" };
        const byFormat = new Map<string, number>();
        const byHour = new Map<string, number>();
        for (const item of valid) {
            byFormat.set(item.format, (byFormat.get(item.format) ?? 0) + item.interactions);
            byHour.set(item.hour, (byHour.get(item.hour) ?? 0) + item.interactions);
        }
        return {
            bestFormat: [...byFormat].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
            bestHour: [...byHour].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
            tag: "آمار واقعی صفحه",
        };
    } catch {
        return { bestFormat: null, bestHour: null, tag: "بدون داده‌ی آماری" };
    }
}

function hookFor(topic: string, goal: typeof goals[number], occasion?: string) {
    if (occasion) return `این مناسبت چه پیوندی با ${topic} دارد؟`;
    if (goal === "ATTRACT") return `روایت ${topic} از کجا آغاز می‌شود؟`;
    if (goal === "ENGAGE") return `شما درباره‌ی ${topic} چه می‌دانید؟`;
    if (goal === "SAVE") return `سه نکته برای بازخوانی ${topic}`;
    return `این روایت ${topic} را با علاقه‌مندان تاریخ به اشتراک بگذارید.`;
}

export async function buildCalendar(input: { startDate?: string; onlyDate?: string } = {}) {
    const settings = await getSettingsOrDefault();
    const weeklyPattern = { ...DEFAULT_SETTINGS.weeklyPattern, ...(settings.weeklyPattern as Partial<typeof DEFAULT_SETTINGS.weeklyPattern> ?? {}) };
    const topics = await getTopics();
    if (!topics.length) throw new Error("فایل data/topics.json خالی است؛ موضوع‌های تقویم را وارد کنید.");
    const occasions = await getOccasions();
    const today = input.onlyDate ? tehranDate(new Date(`${input.onlyDate}T12:00:00`)) : input.startDate ? tehranDate(new Date(`${input.startDate}T12:00:00`)) : tehranDate(new Date());
    const rangeStart = input.onlyDate ? today : today;
    const rangeEnd = input.onlyDate ? addDays(today, 1) : addDays(today, 7);
    const [hints, previous, recentTopics] = await Promise.all([
        performanceHints(),
        db.calendarItem.findMany({ where: { date: { gte: rangeStart, lt: rangeEnd } }, select: { id: true, date: true, topic: true, format: true, time: true, status: true } }),
        db.calendarItem.findMany({ where: { date: { gte: addDays(today, -14), lt: today } }, orderBy: { date: "desc" }, take: 50, select: { topic: true } }),
    ]);
    const topicsToKeep = input.onlyDate ? previous.filter(item => dayKey(item.date) === dayKey(today) && item.status !== "SUGGESTED") : [];
    if (input.onlyDate) {
        await db.calendarItem.deleteMany({ where: { date: { gte: today, lt: addDays(today, 1) }, status: "SUGGESTED" } });
    }
    const recent = recentTopics.slice(0, 2).map(item => item.topic);
    let topicCursor = recentTopics.length % topics.length;
    const storyTimes = [weeklyPattern.storyTimes.morning, weeklyPattern.storyTimes.noon, weeklyPattern.storyTimes.afternoon, weeklyPattern.storyTimes.night].slice(0, weeklyPattern.storiesPerDay);
    const slots: { date: Date; format: "POST" | "CAROUSEL" | "REEL" | "STORY"; time: string; period: typeof periods[number] | null }[] = [];
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(today, index));
    const appendWeekly = (format: "CAROUSEL" | "REEL", count: number, time: string) => {
        for (let index = 0; index < count; index++) {
            const dayIndex = Math.min(6, Math.floor(((index + .5) * 7) / Math.max(1, count)));
            slots.push({ date: weekDays[dayIndex], format, time: hints.bestFormat === format && hints.bestHour ? hints.bestHour : time, period: null });
        }
    };
    appendWeekly("REEL", weeklyPattern.reelsPerWeek, weeklyPattern.reelTime);
    appendWeekly("CAROUSEL", weeklyPattern.carouselsPerWeek, weeklyPattern.carouselTime);
    for (const date of weekDays) storyTimes.forEach((time, index) => slots.push({ date, format: "STORY", time, period: periods[index] }));

    const existingKeys = new Set(previous
        .filter(item => !input.onlyDate || item.status !== "SUGGESTED")
        .map(item => `${dayKey(item.date)}:${item.format}:${item.time}`));
    const result: Awaited<ReturnType<typeof db.calendarItem.create>>[] = [];
    for (const slot of slots) {
        if (input.onlyDate && dayKey(slot.date) !== dayKey(today)) continue;
        const occasionDate = dayKey(slot.date).slice(5);
        const occasion = occasions.find(item => item.date === occasionDate);
        let topic = occasion?.title;
        if (!topic) {
            let attempts = 0;
            do {
                topic = topics[topicCursor++ % topics.length].title;
                attempts++;
            } while (recent.includes(topic) && attempts < topics.length);
        }
        recent.push(topic);
        if (recent.length > 2) recent.shift();
        const category = categories[topicCursor++ % categories.length];
        const goal: typeof goals[number] = goals[result.length % goals.length];
        const key = `${dayKey(slot.date)}:${slot.format}:${slot.time}`;
        if (existingKeys.has(key)) continue;
        const item = await db.calendarItem.create({
            data: {
                date: slot.date, time: slot.time, period: slot.period, format: slot.format,
                topic, category, goal, hook: hookFor(topic, goal, occasion?.title),
                sourceTag: hints.tag, occasion: occasion ? `${occasion.title} · ${occasion.source}` : null,
            },
        });
        result.push(item);
    }
    return { items: [...topicsToKeep, ...result], sourceTag: hints.tag };
}

export async function getCalendarItems(startDate?: string) {
    const start = startDate ? tehranDate(new Date(`${startDate}T12:00:00`)) : tehranDate(new Date());
    return db.calendarItem.findMany({ where: { date: { gte: start, lt: addDays(start, 7) } }, orderBy: [{ date: "asc" }, { time: "asc" }] });
}
