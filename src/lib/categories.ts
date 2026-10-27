export const CATEGORY_KEYS = [
  "ancient-iran",
  "shahnameh",
  "myth",
  "achievements",
  "kings",
  "culture",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORIES: { key: CategoryKey; title: string; icon: string }[] = [
  { key: "ancient-iran", title: "ایران باستان", icon: "🏛️" },
  { key: "shahnameh", title: "شاهنامه", icon: "📜" },
  { key: "myth", title: "اساطیر ایرانی", icon: "🐉" },
  { key: "achievements", title: "دستاوردهای ایرانیان", icon: "💡" },
  { key: "kings", title: "پادشاهان و سلسله‌ها", icon: "👑" },
  { key: "culture", title: "جشن‌ها و آیین‌ها", icon: "🔥" },
] as const;

export const FORMATS = ["POST", "STORY", "REEL"] as const;
export type Format = (typeof FORMATS)[number];
export const STATUSES = ["IDEA", "TO_RECORD", "READY", "PUBLISHED"] as const;

export const FORMAT_FA: Record<Format, string> = {
  POST: "پست",
  STORY: "استوری",
  REEL: "ریلز",
};

export const STATUS_FA: Record<(typeof STATUSES)[number], string> = {
  IDEA: "ایده",
  TO_RECORD: "آماده ضبط",
  READY: "آماده انتشار",
  PUBLISHED: "منتشرشده",
};

export function catTitle(key: string) {
  return CATEGORIES.find(category => category.key === key)?.title ?? key;
}
