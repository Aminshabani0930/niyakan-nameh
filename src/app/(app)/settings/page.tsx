"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Settings = {
  postMix: string;
  postsPerWeek: number;
  agentEnabled: boolean;
  imageStyle: string;
  carouselSlides: number;
};

type Status = {
  database: boolean;
  configured: {
    text: boolean;
    image: boolean;
    cloudinary: boolean;
    instagram: boolean;
    telegram: boolean;
  };
  models: { text: string | null; fast?: string | null; review?: string | null; fallback?: string | null; image: string | null };
  environment: { name: string; configured: boolean }[];
};

const MIX_OPTIONS = [
  { value: "MIX", label: "ترکیبی (پست، ریلز، کاروسل)" },
  { value: "SINGLE", label: "پست تک‌عکسی" },
  { value: "CAROUSEL", label: "کاروسل" },
  { value: "REEL", label: "ریلز" },
];

export default function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [databaseBytes, setDatabaseBytes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [settings, agentStatus, storage] = await Promise.all([
        api<Settings>("/api/settings"),
        api<Status>("/api/agent/status"),
        api<{ bytes: number | null }>("/api/storage"),
      ]);
      setForm(settings);
      setStatus(agentStatus);
      setDatabaseBytes(storage.bytes);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "دریافت تنظیمات ناموفق بود");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm(current => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setMsg("");
    try {
      const saved = await api<Settings>("/api/settings", "PATCH", form);
      setForm(saved);
      setMsg("تنظیمات ذخیره شد ✅");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "ذخیره‌ی تنظیمات ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <main className="main-area">
        <header className="topbar"><div><div className="eyebrow">پیکربندی</div><h1 className="page-title">تنظیمات</h1></div></header>
        {msg ? <p className="message-banner error">{msg}</p> : <div className="empty-state">در حال دریافت تنظیمات…</div>}
      </main>
    );
  }

  return (
    <main className="main-area">
      <header className="topbar">
        <div>
          <div className="eyebrow">پیکربندی ایجنت</div>
          <h1 className="page-title">تنظیمات</h1>
          <div className="topbar-date">رفتار برنامه‌ریز، تصویر و انتشار</div>
        </div>
        <div className="top-actions">
          <button className="primary-button" disabled={busy} onClick={save}>{busy ? "در حال ذخیره…" : "ذخیره"}</button>
        </div>
      </header>

      {msg && <p role="status" className={`message-banner ${msg.includes("ناموفق") || msg.includes("خطا") ? "error" : ""}`}>{msg}</p>}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">تنظیمات برنامه‌ریز</h2>
            <div className="panel-subtitle">
              پیش‌فرض‌ها: ترکیب پست و ریلز و کاروسل، انتشار خودکار خاموش، سبک نگارگری ایرانی.
              هر کدام را می‌توانی همین‌جا عوض کنی.
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">ترکیب قالب محتوا</span>
            <select className="field-input" value={form.postMix} onChange={event => update("postMix", event.target.value)}>
              {MIX_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span className="field-hint">قالب‌هایی که ایجنت در برنامه‌ی خودکار استفاده می‌کند.</span>
          </label>

          <label className="field">
            <span className="field-label">تعداد محتوا در هفته</span>
            <input className="field-input" type="number" min={1} max={14} value={form.postsPerWeek}
              onChange={event => update("postsPerWeek", Number(event.target.value))} />
            <span className="field-hint">بین ۱ تا ۱۴ محتوا در هر هفته.</span>
          </label>

          <label className="field">
            <span className="field-label">تعداد اسلاید کاروسل</span>
            <input className="field-input" type="number" min={1} max={10} value={form.carouselSlides}
              onChange={event => update("carouselSlides", Number(event.target.value))} />
            <span className="field-hint">برای متن و ساختار کاروسل؛ تصویرها دستی هم قابل افزودن‌اند.</span>
          </label>

          <label className="field">
            <span className="field-label">سبک تصویر</span>
            <textarea className="field-input field-textarea" rows={4} value={form.imageStyle}
              onChange={event => update("imageStyle", event.target.value)} />
            <span className="field-hint">این متن به prompt هر تصویر اضافه می‌شود. عبارت «بدون متن و واترمارک» را حذف نکن.</span>
          </label>
        </div>

        <div className="toggle-list">
          <label className="toggle-row">
            <input type="checkbox" checked={form.agentEnabled} onChange={event => update("agentEnabled", event.target.checked)} />
            <span><b>ایجنت روزانه</b><small>در کران روزانه، روزهای خالی هفته‌ی آینده را پر کن.</small></span>
          </label>
        </div>

        <button className="primary-button" disabled={busy} onClick={save}>{busy ? "در حال ذخیره…" : "ذخیره‌ی تنظیمات"}</button>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading"><div><h2 className="panel-title">مصرف دیتابیس</h2><div className="panel-subtitle">اندازه‌ی فعلی دیتابیس در Postgres؛ فضای IndexedDB آفلاین روی هر دستگاه جداست.</div></div></div>
        <strong>{databaseBytes === null ? "در دسترس نیست" : `${(databaseBytes / 1024 / 1024).toFixed(1)} مگابایت`}</strong>
        <p className="panel-subtitle">طرح‌های رایگان سقف مصرف دارند؛ پیش از واردکردن فایل‌های بزرگ، اندازه‌ی فعلی را با سقف حساب Neon مقایسه کنید.</p>
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">وضعیت اتصال‌ها</h2>
            <div className="panel-subtitle">کلیدها فقط در Environment Variables سرور نگهداری می‌شوند؛ این‌جا فقط وضعیتشان دیده می‌شود.</div>
          </div>
        </div>

        <div className="env-grid">
          {[
            ["متن GapGPT", status?.configured.text, status?.models.text],
            ["مدل سبک GapGPT", status?.configured.fast, status?.models.fast],
            ["بازبینی ارجاع GapGPT", status?.configured.review, status?.models.review],
            ["جایگزین GapGPT", status?.configured.fallback, status?.models.fallback],
            ["تصویر GapGPT", status?.configured.image, status?.models.image],
            ["Cloudinary", status?.configured.cloudinary, "آپلود تصویر AI"],
            ["اینستاگرام", status?.configured.instagram, "انتشار و آمار"],
            ["تلگرام", status?.configured.telegram, "خلاصه‌ی روزانه"],
            ["دیتابیس", status?.database, "Postgres / Prisma"],
          ].map(([label, ok, hint]) => (
            <div className={`env-chip ${ok ? "ok" : "missing"}`} key={String(label)}>
              <span>{ok ? "✓" : "×"}</span>
              <div><b>{label}</b><small>{hint}</small></div>
            </div>
          ))}
        </div>

        <h3 className="panel-title" style={{ marginTop: 18 }}>متغیرهای محیطی</h3>
        <div className="env-grid" style={{ marginTop: 10 }}>
          {(status?.environment ?? []).map(item => (
            <div className={`env-chip ${item.configured ? "ok" : "missing"}`} key={item.name}>
              <span>{item.configured ? "✓" : "×"}</span>
              <div><b>{item.name}</b><small>{item.configured ? "تنظیم شده" : "تنظیم نشده"}</small></div>
            </div>
          ))}
        </div>

        <p className="panel-subtitle" style={{ marginTop: 14 }}>
          برای تغییر مقادیر، آن‌ها را در `.env` محلی یا Render → Environment تنظیم و سرویس را ری‌استارت کن.
          محتوا فقط پس از تأیید دستی قابل انتشار است.
        </p>
      </section>
    </main>
  );
}
