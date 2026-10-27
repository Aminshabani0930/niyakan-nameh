import { z } from "zod";
import OpenAI from "openai";
import { CATEGORY_KEYS, FORMATS, catTitle } from "./categories";
import { uploadBase64Image, uploadImageUrl } from "./cloudinary";

const ItemOut = z.object({
  title: z.string().min(1),
  caption: z.string().default(""),
  script: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  imagePrompt: z.string().optional(),
  slides: z.array(z.string()).default([]),
});

const ContentOut = z.object({ items: z.array(ItemOut) });
const PlanOut = z.object({
  items: z.array(ItemOut.extend({
    category: z.enum(CATEGORY_KEYS),
    format: z.enum(FORMATS),
  })),
});

export type Suggestion = z.infer<typeof ItemOut> & {
  imageUrl: string | null;
  imageUrls: string[];
  imageError: string | null;
};

export type PlanSuggestion = Suggestion & {
  category: (typeof CATEGORY_KEYS)[number];
  format: (typeof FORMATS)[number];
};

export type PlanSlot = {
  category: (typeof CATEGORY_KEYS)[number];
  format: (typeof FORMATS)[number];
};

export function aiErrorMessage(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : "";
  if (/quota|insufficient|pre-consume/i.test(text)) {
    return "اعتبار حساب GapGPT کافی نیست؛ از پنل GapGPT حساب را شارژ کنید.";
  }
  if (/401|unauthorized|invalid.*(api|key)|incorrect.*key/i.test(text)) {
    return "کلید GapGPT معتبر نیست؛ مقدار AI_API_KEY را بررسی کنید.";
  }
  if (/AI_BASE_URL|AI_TEXT_MODEL|AI_IMAGE_MODEL/.test(text)) return "تنظیمات مدل هوش مصنوعی کامل نیست.";
  if (/timeout|timed out|ETIMEDOUT/i.test(text)) return "مهلت پاسخ‌گویی سرویس هوش مصنوعی تمام شد؛ دوباره تلاش کنید.";
  return "سرویس هوش مصنوعی پاسخ نداد؛ تنظیمات اتصال را بررسی و دوباره تلاش کنید.";
}

type ChatMessage = { role: "system" | "user"; content: string };

const DEFAULT_IMAGE_STYLE =
  "نگارگری ایرانی، مینیاتور صفوی، بافت کاغذ کهنه، رنگ‌های خاکی، لاجوردی و طلایی، " +
  "ترکیب‌بندی سینمایی، بدون متن و واترمارک";

const IMAGE_FAILED = "تولید تصویر ناموفق بود؛ پیشنهاد متنی حفظ شد.";

type ModelRole = "text" | "fast" | "review";
const MODEL_DEFAULTS: Record<ModelRole, string> = {
  text: "gpt-5.6-terra",
  fast: "gpt-5.6-luna",
  review: "gpt-5.6-sol",
};

function allowedModel(model: string) {
  return /^gpt-5\.6-(terra|luna|sol)$/i.test(model) ||
    /^gapgpt-qwen-3\.5$/i.test(model) || /^gemini(?:-[a-z0-9._-]+)?$/i.test(model);
}

function configuredModel(role: ModelRole) {
  const key = role === "text" ? "AI_TEXT_MODEL" : role === "fast" ? "AI_FAST_MODEL" : "AI_REVIEW_MODEL";
  const model = process.env[key]?.trim() || MODEL_DEFAULTS[role];
  if (!allowedModel(model)) throw new Error(`${key} must name a supported GapGPT model family`);
  return model;
}

function fallbackModel() {
  const model = process.env.AI_FALLBACK_MODEL?.trim() || "gapgpt-qwen-3.5";
  if (!allowedModel(model)) throw new Error("AI_FALLBACK_MODEL must name a supported GapGPT model family");
  return model;
}

function imageModel() {
  return process.env.AI_IMAGE_MODEL?.trim() || "";
}

function imageStyle(style?: string) {
  const configuredStyle = process.env.AI_IMAGE_STYLE?.trim();
  const savedStyle = style?.trim();
  const styles = [...new Set([configuredStyle, savedStyle].filter((value): value is string => Boolean(value)))];
  return styles.length ? styles.join(". ") : DEFAULT_IMAGE_STYLE;
}

function getClient() {
  const apiKey = process.env.AI_API_KEY?.trim();
  const baseURL = process.env.AI_BASE_URL?.trim();
  if (!apiKey) throw new Error("کلید AI_API_KEY تنظیم نشده است");
  if (!baseURL) throw new Error("AI_BASE_URL is not configured");
  if (baseURL.replace(/\/$/, "") !== "https://api.gapgpt.app/v1") {
    throw new Error("AI_BASE_URL must use the GapGPT OpenAI-compatible endpoint");
  }
  return new OpenAI({ apiKey, baseURL, timeout: 13_000, maxRetries: 0 });
}

function parseJsonObject(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // پیام خطای روشن‌تر پایین‌تر ساخته می‌شود
      }
    }
    throw new Error("پاسخ هوش مصنوعی JSON معتبر نیست");
  }
}

async function requestJson<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  maxTokens = 4_000,
  role: ModelRole = "text",
): Promise<T> {
  const client = getClient();
  const primary = configuredModel(role);
  const fallback = fallbackModel();
  let lastError: unknown;
  for (const model of [...new Set([primary, fallback])]) {
    try {
      const res = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages,
        max_tokens: maxTokens,
      });
      const content = res.choices[0]?.message.content;
      if (!content) throw new Error("پاسخ خالی از سرویس هوش مصنوعی دریافت شد");
      return schema.parse(parseJsonObject(content));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("پاسخ از سرویس هوش مصنوعی دریافت نشد");
}

type RawItem = {
  title: string;
  caption?: string;
  script?: string;
  hashtags?: string[];
  imagePrompt?: string;
  slides?: string[];
};

function normalizeHashtags(list: string[]) {
  const seen = new Set<string>();
  return list
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => (tag.startsWith("#") ? tag : `#${tag}`))
    .filter(tag => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

function normalizeItem(item: RawItem) {
  return {
    ...item,
    caption: (item.caption ?? "").trim(),
    script: (item.script ?? "").trim(),
    hashtags: normalizeHashtags(item.hashtags ?? []),
    slides: item.slides ?? [],
  };
}

function buildImagePrompt(item: RawItem, style?: string) {
  const subject = item.imagePrompt?.trim() || `${item.title}. ${item.caption}`;
  return `${imageStyle(style)}. هماهنگ با رنگ و سبک تصاویر دیگر همین مجموعه. ${subject}. هیچ متن، حرف، عدد، لوگو یا واترمارکی در تصویر نباشد.`;
}

export async function generateImage(prompt: string) {
  const model = imageModel();
  if (!model) throw new Error("مدل تصویر AI_IMAGE_MODEL تنظیم نشده است");

  const client = getClient();
  const configuredSize = process.env.AI_IMAGE_SIZE?.trim();
  const size = configuredSize && ["1024x1024", "1024x1536", "1536x1024"].includes(configuredSize)
    ? configuredSize as "1024x1024" | "1024x1536" | "1536x1024"
    : "1024x1536";
  const image = await client.images.generate({
    model,
    prompt,
    n: 1,
    size,
  }, { timeout: 13_000, maxRetries: 0 });

  const data = image.data?.[0] as { url?: string; b64_json?: string; media_type?: string } | undefined;
  if (data?.url) return uploadImageUrl(data.url);
  if (data?.b64_json) {
    return uploadBase64Image(data.b64_json, data.media_type || "image/png");
  }
  throw new Error("سرویس تصویر آدرس یا داده‌ی تصویر برنگرداند");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function attachImages<T extends RawItem>(
  items: T[],
  options: { style?: string; generate?: boolean; maxImages?: number; imageCount?: number | ((item: T) => number) },
): Promise<(T & { imageUrl: string | null; imageUrls: string[]; imageError: string | null })[]> {
  const model = imageModel();
  const generate = options.generate !== false;
  const requestedFor = (item: T) => Math.max(1,
    typeof options.imageCount === "function" ? options.imageCount(item) : options.imageCount ?? 1);
  const totalRequested = items.reduce((total, item) => total + requestedFor(item), 0);
  const limit = Math.max(0, Math.min(options.maxImages ?? totalRequested, totalRequested));
  let used = 0;

  return mapLimit(items, 3, async item => {
    if (!generate || !model) {
      return {
        ...item,
        imageUrl: null,
        imageUrls: [],
        imageError: !model ? "مدل تصویر AI_IMAGE_MODEL تنظیم نشده است" : "تولید تصویر غیرفعال است",
      };
    }
    const requested = requestedFor(item);
    const count = Math.min(requested, Math.max(0, limit - used));
    if (count === 0) {
      return { ...item, imageUrl: null, imageUrls: [], imageError: "سهمیه‌ی تصویر این اجرا تمام شد" };
    }
    used += count;
    const imageUrls: string[] = [];
    let failed = false;
    for (let index = 0; index < count; index++) {
      try {
        const slide = item.slides?.[index];
        const slideItem = slide ? { ...item, imagePrompt: `${item.imagePrompt ?? item.title}. ${slide}` } : item;
        imageUrls.push(await generateImage(buildImagePrompt(slideItem, options.style)));
      } catch {
        failed = true;
        console.warn(IMAGE_FAILED);
      }
    }
    if (count < requested) failed = true;
    const imageError = failed
      ? count < requested && imageUrls.length === count
        ? "سهمیه‌ی تصویر این اجرا برای همه‌ی اسلایدها کافی نبود"
        : IMAGE_FAILED
      : null;
    return { ...item, imageUrl: imageUrls[0] ?? null, imageUrls, imageError };
  });
}

export async function suggestContent(o: {
  category: string;
  format: string;
  count: number;
  existingTitles: string[];
  imageStyle?: string;
  generateImages?: boolean;
  maxImages?: number;
  carouselSlides?: number;
}) {
  const formatLine = o.format === "REEL"
    ? "برای ریلز اسکریپت ۳۰ تا ۶۰ ثانیه‌ای با قلاب در ۳ ثانیه‌ی اول بنویس."
    : o.format === "CAROUSEL"
      ? `برای کاروسل دقیقاً ${carouselSlideCount(o.carouselSlides)} اسلاید شماره‌گذاری‌شده در slides و script بنویس.`
      : "برای استوری متن کوتاه و قابل خواندن در یک نگاه بنویس.";

  const output = await requestJson(ContentOut, [
    {
      role: "system",
      content:
        "تو ایجنت تولید محتوای برند «نیاکان نامه» هستی (تاریخ، فرهنگ، اساطیر ایران و شاهنامه). " +
        "فقط محتوای دقیق و مستند پیشنهاد بده، ادعای بی‌منبع نساز و اگر مطمئن نیستی بنویس «نیازمند راستی‌آزمایی». " +
        "همه‌ی متن‌ها فارسی روان باشند. " +
        `${formatLine} ` +
        "برای هر آیتم یک imagePrompt کوتاه و بصری بنویس (صحنه، سوژه، نور و حال‌وهوا) بدون متن داخل تصویر. " +
        'خروجی فقط JSON: {"items":[{"title","caption","script","hashtags":[],"imagePrompt":"","slides":[]}]}',
    },
    {
      role: "user",
      content:
        `دسته: ${o.category}\nقالب: ${o.format}\nتعداد: ${o.count}\n` +
        `عنوان‌های تکراری نباشد: ${o.existingTitles.slice(0, 100).join("، ") || "ندارد"}`,
    },
  ], Math.min(8_000, 700 * o.count + 600));

  const items = output.items.map(normalizeItem);
  return attachImages(items, {
    style: o.imageStyle,
    generate: o.generateImages,
    maxImages: o.maxImages,
    imageCount: o.format === "CAROUSEL" ? carouselSlideCount(o.carouselSlides) : 1,
  });
}

export async function suggestPlan(o: {
  slots: PlanSlot[];
  existingTitles: string[];
  imageStyle?: string;
  generateImages?: boolean;
  maxImages?: number;
  carouselSlides?: number;
}): Promise<PlanSuggestion[]> {
  if (o.slots.length === 0) return [];

  const slotLines = o.slots.map((slot, index) =>
    `${index + 1}. دسته: ${catTitle(slot.category)} (${slot.category}) | قالب: ${slot.format}`,
  ).join("\n");

  const output = await requestJson(PlanOut, [
    {
      role: "system",
      content:
        "تو ایجنت برنامه‌ریز محتوای برند «نیاکان نامه» هستی (تاریخ، فرهنگ، اساطیر ایران و شاهنامه). " +
        "برای هر جایگاه دقیقاً یک محتوا و به همان ترتیب بساز. دسته و قالب هر جایگاه را عیناً حفظ کن. " +
        "محتوا باید دقیق و مستند باشد؛ ادعای بی‌منبع نساز و اگر مطمئن نیستی بنویس «نیازمند راستی‌آزمایی». " +
        "همه‌ی متن‌ها فارسی روان باشند. " +
        "برای ریلز اسکریپت ۳۰ تا ۶۰ ثانیه‌ای با قلاب در ۳ ثانیه‌ی اول بنویس. " +
        `برای کاروسل دقیقاً ${carouselSlideCount(o.carouselSlides)} اسلاید در slides و متن آن‌ها را در script شماره‌گذاری کن. ` +
        "برای هر آیتم imagePrompt کوتاه و بصری بنویس، بدون متن داخل تصویر. " +
        'خروجی فقط JSON: {"items":[{"category","format","title","caption","script","hashtags":[],"imagePrompt":"","slides":[]}]}',
    },
    {
      role: "user",
      content:
        `جایگاه‌ها:\n${slotLines}\n\n` +
        `عنوان‌های تکراری نباشد: ${o.existingTitles.slice(0, 100).join("، ") || "ندارد"}`,
    },
  ], Math.min(10_000, 750 * o.slots.length + 800));

  const items = output.items.slice(0, o.slots.length).map((item, index) => ({
    ...normalizeItem(item),
    category: o.slots[index].category,
    format: o.slots[index].format,
  }));

  return attachImages(items, {
    style: o.imageStyle,
    generate: o.generateImages,
    maxImages: o.maxImages ?? Math.min(items.length, Number(process.env.AGENT_MAX_IMAGES_PER_RUN || 6)),
    imageCount: item => item.format === "CAROUSEL" ? carouselSlideCount(o.carouselSlides) : 1,
  });
}

function carouselSlideCount(fallback?: number) {
  const value = Number(process.env.AI_CAROUSEL_SLIDES);
  const count = Number.isInteger(value) && value >= 2 && value <= 10 ? value : fallback;
  return Number.isInteger(count) ? Math.min(10, Math.max(2, count!)) : 3;
}

export async function generatePlannedContent(input: {
  topic: string;
  publishDate: Date;
  type: "POST" | "CAROUSEL" | "REEL";
  tone: string;
  notes: string;
  imageStyle?: string;
  carouselSlides?: number;
}) {
  const slides = input.type === "CAROUSEL" ? carouselSlideCount(input.carouselSlides) : 0;
  const output = await requestJson(PlanOut, [
    {
      role: "system",
      content:
        "برای برند نیاکان‌نامه محتوای فارسی روان درباره‌ی ایران باستان تولید کن. " +
        "از ادعاهای بی‌منبع پرهیز کن؛ هر نکته‌ای که از درستی آن مطمئن نیستی دقیقاً با عبارت «نیاز به بررسی» علامت بزن. " +
        "کپشن فارسی، هشتگ‌های مرتبط و تصویر تاریخی هماهنگ بساز. در تصویر هیچ متن، حرف، عدد، لوگو یا واترمارکی نباشد. " +
        (input.type === "REEL" ? "برای ریلز متن اجرایی ۳۰ تا ۶۰ ثانیه‌ای بنویس." : "") +
        (slides ? `برای کاروسل دقیقاً ${slides} اسلاید شماره‌گذاری‌شده و متن هر اسلاید در slides بساز.` : "") +
        'خروجی فقط JSON: {"items":[{"category","format","title","caption","script","hashtags":[],"imagePrompt":"","slides":[]}]}',
    },
    {
      role: "user",
      content:
        `موضوع: ${input.topic}\nتاریخ انتشار: ${input.publishDate.toISOString()}\nنوع: ${input.type}\n` +
        `لحن: ${input.tone}\nنکات تکمیلی: ${input.notes || "ندارد"}\n` +
        `قالب دقیق: ${input.type}`,
    },
  ]);
  const item = output.items[0];
  if (!item) throw new Error("پاسخ خالی از سرویس هوش مصنوعی دریافت شد");
  const normalized = { ...normalizeItem(item), category: item.category };
  return attachImages([normalized], {
    style: input.imageStyle,
    generate: true,
    maxImages: slides || 1,
    imageCount: slides || 1,
  }).then(([result]) => ({ ...result, format: input.type }));
}
