import { db } from "./db";

export const POST_MIXES = ["MIX", "SINGLE", "CAROUSEL", "REEL"] as const;
export type PostMix = (typeof POST_MIXES)[number];

export const DEFAULT_IMAGE_STYLE =
  "نگارگری ایرانی، مینیاتور صفوی، بافت کاغذ کهنه، رنگ‌های خاکی، لاجوردی و طلایی، " +
  "ترکیب‌بندی سینمایی، بدون متن و واترمارک";

export const DEFAULT_SETTINGS = {
  postMix: "MIX" as PostMix,
  postsPerWeek: 4,
  autoPublish: false,
  agentEnabled: true,
  imageStyle: DEFAULT_IMAGE_STYLE,
  carouselSlides: 3,
};

/** یک رکورد تنظیمات برای کل برنامه؛ اگر نبود با مقادیر پیش‌فرض ساخته می‌شود. */
export async function getSettings() {
  const settings = await db.appSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return { ...settings, autoPublish: false };
}

export async function getSettingsOrDefault() {
  try {
    return await getSettings();
  } catch {
    return { id: "singleton", ...DEFAULT_SETTINGS, updatedAt: new Date() };
  }
}

const ENVIRONMENT_VARIABLES = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "APP_PASSWORD",
  "CRON_SECRET",
  "AGENT_MAX_IMAGES_PER_RUN",
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_TEXT_MODEL",
  "AI_FAST_MODEL",
  "AI_REVIEW_MODEL",
  "AI_FALLBACK_MODEL",
  "AI_IMAGE_MODEL",
  "AI_IMAGE_SIZE",
  "AI_IMAGE_STYLE",
  "AI_CAROUSEL_SLIDES",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "IG_USER_ID",
  "IG_ACCESS_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export function getEnvironmentStatus() {
  return ENVIRONMENT_VARIABLES.map(name => ({
    name,
    configured: Boolean(process.env[name]?.trim()),
  }));
}
