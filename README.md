# نیاکان نامه (Next.js + Postgres + NextAuth)

```bash
npm install
cp .env.example .env     # مقادیر را پر کنید
npx prisma migrate dev --name init
npm run dev
```

## نصب روی اندروید

این برنامه به‌صورت PWA قابل نصب است و APK مستقل نیست. ابتدا برنامه را روی یک دامنه‌ی عمومی با HTTPS میزبانی کنید و متغیرهای محیطی و دیتابیس را در همان محیط تنظیم کنید. سپس در Chrome اندروید نشانی سایت را باز کنید و از منوی مرورگر «نصب برنامه» یا «افزودن به صفحه اصلی» را بزنید. اگر نصب خودکار نمایش داده شد، دکمه‌ی «نصب برنامه» نیز در صفحه ظاهر می‌شود.

صفحات ورود و داشبورد برای نمایش آفلاین ذخیره نمی‌شوند؛ فقط صفحه‌ی راهنمای آفلاین در دسترس است. ورود، دیتابیس و APIها برای کارکردن به اینترنت و سرور نیاز دارند.

- دیتابیس: یک Postgres (مثلاً رایگان در Neon یا Supabase) بسازید و آدرس را در `DATABASE_URL` بگذارید.
- لاگین: `NEXTAUTH_SECRET` را با `openssl rand -base64 32` بسازید. رمز ورود همان `APP_PASSWORD` است.
- روی Vercel: همه‌ی متغیرهای `.env` را در Environment Variables بگذارید، `NEXTAUTH_URL` را به آدرس سایت تغییر دهید، و یک‌بار `npx prisma migrate deploy` را روی دیتابیس اجرا کنید.

- یادآوری ضبط بر اساس `recordDate` انجام می‌شود؛ تاریخ پیش‌فرض ضبط دو روز پیش از انتشار است.
- تست تلگرام در PowerShell: `Invoke-WebRequest -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } http://localhost:3000/api/cron/daily`
- تست تلگرام: `curl -H "Authorization: Bearer CRON_SECRET" localhost:3000/api/cron/daily`
