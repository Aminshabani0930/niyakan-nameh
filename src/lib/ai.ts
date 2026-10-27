import { z } from "zod";

const Out = z.object({
  items: z.array(z.object({
    title: z.string(),
    caption: z.string(),
    script: z.string(),
    hashtags: z.array(z.string()).default([]),
  })),
});

export async function suggestContent(o: {
  category: string; format: string; count: number; existingTitles: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("کلید OPENAI_API_KEY تنظیم نشده است");

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content:
        "تو ایجنت تولید محتوای برند «نیاکان نامه» هستی (تاریخ، فرهنگ، اساطیر ایران و شاهنامه). " +
        "فقط محتوای دقیق و مستند پیشنهاد بده، ادعای بی‌منبع نساز و اگر مطمئن نیستی بنویس «نیازمند راستی‌آزمایی». " +
        "برای REEL اسکریپت ۳۰ تا ۶۰ ثانیه‌ای با قلاب در ۳ ثانیه‌ی اول بنویس. " +
        'خروجی فقط JSON: {"items":[{"title","caption","script","hashtags":[]}]}' },
      { role: "user", content:
        `دسته: ${o.category}\nقالب: ${o.format}\nتعداد: ${o.count}\n` +
        `عنوان‌های تکراری نباشد: ${o.existingTitles.join("، ")}` },
    ],
  });
  const content = res.choices[0]?.message.content;
  if (!content) throw new Error("پاسخ خالی از سرویس هوش مصنوعی دریافت شد");

  let output: unknown;
  try {
    output = JSON.parse(content);
  } catch {
    throw new Error("پاسخ هوش مصنوعی JSON معتبر نیست");
  }
  return Out.parse(output).items;
}
