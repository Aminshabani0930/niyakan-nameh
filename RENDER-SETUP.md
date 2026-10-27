# راه‌اندازی Render

این فایل فقط راهنماست و هیچ کلیدی در آن نیست. مقادیر واقعی را در داشبورد Render وارد کنید.

## ۱) Environment Variables سرویس

در Render → سرویس وب → **Environment** این‌ها را اضافه/به‌روزرسانی کنید:

| کلید | مقدار پیشنهادی |
|---|---|
| `DATABASE_URL` | آدرس اتصال pooled برنامه به Postgres |
| `DIRECT_URL` | آدرس مستقیم همان دیتابیس، بدون pooler، برای اجرای Prisma migration |
| `NEXTAUTH_URL` | `https://<your-service>.onrender.com` |
| `NEXTAUTH_SECRET` | همان مقدار معتبر تولیدشده |
| `APP_PASSWORD` | رمز ورود |
| `CRON_SECRET` | یک رشته‌ی تصادفی طولانی |
| `AI_API_KEY` | کلید GapGPT |
| `AI_BASE_URL` | endpoint سازگار با OpenAI |
| `AI_TEXT_MODEL` | نام مدل متن در GapGPT |
| `AI_FAST_MODEL` | اختیاری؛ پیش‌فرض `gpt-5.6-luna` |
| `AI_REVIEW_MODEL` | اختیاری؛ پیش‌فرض `gpt-5.6-sol` |
| `AI_FALLBACK_MODEL` | اختیاری؛ پیش‌فرض `gapgpt-qwen-3.5` |
| `AI_IMAGE_MODEL` | نام مدل تصویر در GapGPT |
| `AI_IMAGE_SIZE` | `1024x1536` |
| `AI_IMAGE_STYLE` | سبک نگارگری ایرانی (همان مقدار `.env.example`) |
| `AI_CAROUSEL_SLIDES` | `3` |
| `AGENT_MAX_IMAGES_PER_RUN` | `6` |
| `CLOUDINARY_CLOUD_NAME` | از پنل Cloudinary |
| `CLOUDINARY_API_KEY` | از پنل Cloudinary |
| `CLOUDINARY_API_SECRET` | از پنل Cloudinary |
| `IG_USER_ID` | شناسه‌ی اینستاگرام Business/Creator |
| `IG_ACCESS_TOKEN` | توکن Meta Graph |
| `TELEGRAM_BOT_TOKEN` | اختیاری |
| `TELEGRAM_CHAT_ID` | اختیاری |

بعد از ذخیره، سرویس را **Manual Deploy → Clear build cache & deploy** کنید.

## ۲) مایگریشن دیتابیس

از Render Shell (یا از سیستم خودتان با همان `DATABASE_URL`) یک‌بار اجرا کنید:

```bash
npx prisma migrate deploy
```

اگر قبلاً جدول‌ها با `db push` ساخته شده‌اند و مایگریشن init را اعمال نکرده‌اید، اول وضعیت را ببینید:

```bash
npx prisma migrate status
```

مایگریشن `20261027063000_agent_settings` این‌ها را اضافه می‌کند:

- `ContentItem.mediaUrls`، `ContentItem.source`، `ContentItem.imageError`
- جدول `AppSetting`

مایگریشن `20261027065000_plan_items` جدول و وضعیت‌های `PlanItem` و پیوند آن به `ContentItem` را اضافه می‌کند.

مایگریشن `20261028090000_source_library` جداول منبع، بخش‌های full-text، شاهنامه و معماری را اضافه می‌کند. ابتدا وضعیت را بررسی کنید، سپس migrationها را به‌ترتیب زمانی با `npx prisma migrate deploy` اجرا کنید. هیچ migration در زمان build اجرا نمی‌شود.

پس از آن `20261028091000_cyrus_entries` و سپس `20261028092000_research_review` را اجرا کنید. مجموعه‌ی migrationهای قبلی PlanItem باید طبق timestamp قبل از این سه migration اجرا شده باشد.

فایل‌های عادی در `/library` تا ۵MB بارگذاری می‌شوند. فایل‌های بزرگ‌تر را مطابق `data/README.md` در پوشه‌ی `data/` بگذارید و `npm run import:source` را از محیطی با اتصال دیتابیس اجرا کنید. فایل‌ها در مسیر deployment روی Render رایگان پایدار نیستند؛ آن‌ها را در repository یا فضای پایدار خود نگه دارید، نه دیسک موقت سرویس.

## ۳) Cron Job روزانه

در Render → **Cron Jobs** → New Cron Job:

- Schedule: `30 4 * * *` (هر روز ۴:۳۰ صبح)
- Command:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<your-service>.onrender.com/api/cron/daily
```

اگر `CRON_SECRET` را در Environment همان Cron Job هم بگذارید، `$CRON_SECRET` پر می‌شود.

## ۴) نکته‌های مهم

- **اعتبار GapGPT:** اگر موجودی حساب کم باشد، متن هم ممکن است با خطای quota رد شود. حساب را شارژ کنید.
- **مدل تصویر:** خروجی URL یا base64 هر دو در Cloudinary ذخیره می‌شوند؛ سه متغیر Cloudinary لازم‌اند.
- **اینستاگرام:** انتشار خودکار انجام نمی‌شود؛ هر انتشار باید دستی تأیید شود.
- **دسترسی از خارج ایران:** اگر GapGPT از IP Render جواب نداد، متن هم خطا می‌دهد؛ در آن صورت باید از یک واسط/پروکسی معتبر استفاده شود.
- **پلن رایگان Render:** سرویس بعد از بی‌کاری می‌خوابد؛ Cron Job آن را بیدار می‌کند اما اولین درخواست ممکن است کند باشد.
