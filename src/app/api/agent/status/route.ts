import { requireAuth } from "@/lib/auth";
import { getSettings, DEFAULT_SETTINGS, getEnvironmentStatus } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const deny = await requireAuth(); if (deny) return deny;

  let database = false;
  let settings: unknown = DEFAULT_SETTINGS;
  try {
    settings = await getSettings();
    database = true;
  } catch {
    // تنظیمات پیش‌فرض برگردانده می‌شود تا صفحه‌ی ایجنت باز بماند.
  }

  return NextResponse.json({
    database,
    settings,
    models: {
      text: process.env.AI_TEXT_MODEL?.trim() || "gpt-5.6-terra",
      fast: process.env.AI_FAST_MODEL?.trim() || "gpt-5.6-luna",
      review: process.env.AI_REVIEW_MODEL?.trim() || "gpt-5.6-sol",
      fallback: process.env.AI_FALLBACK_MODEL?.trim() || "gapgpt-qwen-3.5",
      image: process.env.AI_IMAGE_MODEL || null,
    },
    environment: getEnvironmentStatus(),
    configured: {
      text: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL),
      fast: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL),
      review: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL),
      fallback: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL),
      image: Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_IMAGE_MODEL),
      cloudinary: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
      ),
      instagram: Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    },
  });
}
