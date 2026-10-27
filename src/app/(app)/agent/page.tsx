"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import AgentPlanItems from "@/components/AgentPlanItems";

type AgentStatus = {
  database: boolean;
  models: { text: string | null; image: string | null };
  configured: {
    text: boolean;
    image: boolean;
    cloudinary: boolean;
    instagram: boolean;
    telegram: boolean;
  };
  settings: {
    postMix: string;
    postsPerWeek: number;
    agentEnabled: boolean;
    imageStyle: string;
    carouselSlides: number;
  };
};

type RunResult = {
  created: number;
  skipped: number;
  images: number;
  imageErrors: number;
  dates: string[];
  errors: string[];
};

const MIX_FA: Record<string, string> = {
  MIX: "ترکیبی",
  SINGLE: "پست تک‌عکسی",
  CAROUSEL: "کاروسل",
  REEL: "ریلز",
};

export default function AgentPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [days, setDays] = useState(7);
  const [withImages, setWithImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await api<AgentStatus>("/api/agent/status"));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "دریافت وضعیت ایجنت ناموفق بود");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run() {
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const response = await api<RunResult>("/api/agent/plan", "POST", { days, withImages });
      setResult(response);
      setMsg(`${response.created.toLocaleString("fa-IR")} محتوا ساخته شد`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "اجرای ایجنت ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  const ready = status?.configured;

  return (
    <main className="main-area">
      <header className="topbar">
        <div>
          <div className="eyebrow">دستیار برنامه‌ریز</div>
          <h1 className="page-title">ایجنت نیاکان‌نامه</h1>
          <div className="topbar-date">ایده، متن، تصویر و چیدمان تقویم — یک‌جا</div>
        </div>
        <div className="top-actions">
          <Link className="secondary-button" href="/settings">⚙ تنظیمات</Link>
          <button className="icon-button" aria-label="بارگذاری دوباره" onClick={load}>↻</button>
        </div>
      </header>

      {msg && <p role="status" className={`message-banner ${busy ? "" : msg.includes("ناموفق") || msg.includes("خطا") ? "error" : ""}`}>{msg}</p>}

      <section className="stats-grid" aria-label="وضعیت اتصال‌ها">
        <article className="stat-card">
          <div className="stat-top"><span>مدل متن</span><span className="stat-icon">✦</span></div>
          <div className="stat-number">{ready?.text ? "آماده" : "ناقص"}</div>
          <div className="stat-hint">{status?.models.text ?? "AI_TEXT_MODEL تنظیم نشده"}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>مدل تصویر</span><span className="stat-icon">▣</span></div>
          <div className="stat-number">{ready?.image ? "آماده" : "ناقص"}</div>
          <div className="stat-hint">{status?.models.image ?? "AI_IMAGE_MODEL تنظیم نشده"}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Cloudinary</span><span className="stat-icon">☁</span></div>
          <div className="stat-number">{ready?.cloudinary ? "آماده" : "ناقص"}</div>
          <div className="stat-hint">محل نگهداری تصویرهای AI</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>اینستاگرام</span><span className="stat-icon">◎</span></div>
          <div className="stat-number">{ready?.instagram ? "آماده" : "ناقص"}</div>
          <div className="stat-hint">انتشار فقط پس از تأیید دستی</div>
        </article>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">اجرای دستی</h2>
              <div className="panel-subtitle">
                روزهای خالی بازه را با ایده و متن پر می‌کند. تصویر فقط برای محتواهای تازه ساخته می‌شود.
              </div>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">بازه‌ی برنامه‌ریزی</span>
              <select className="field-input" value={days} onChange={event => setDays(Number(event.target.value))}>
                <option value={7}>۷ روز آینده</option>
                <option value={14}>۱۴ روز آینده</option>
                <option value={30}>۳۰ روز آینده</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">تصویر</span>
              <span className="toggle-row">
                <input type="checkbox" checked={withImages} onChange={event => setWithImages(event.target.checked)} />
                ساخت تصویر برای پیشنهادها
              </span>
            </label>
          </div>

          <button className="primary-button" disabled={busy} onClick={run}>
            {busy ? "در حال اجرا…" : "✦ اجرای ایجنت"}
          </button>

          <p className="panel-subtitle" style={{ marginTop: 14 }}>
            برای هر تصویر هزینه‌ی API پرداخت می‌شود. سهمیه‌ی هر اجرا با
            <code> AGENT_MAX_IMAGES_PER_RUN </code>
            کنترل می‌شود.
          </p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">تنظیمات فعلی</h2>
              <div className="panel-subtitle">از صفحه‌ی تنظیمات قابل تغییر است</div>
            </div>
            <Link className="text-link" href="/settings">ویرایش ←</Link>
          </div>
          <div className="settings-summary">
            <div><span>ترکیب قالب</span><b>{MIX_FA[status?.settings.postMix ?? "MIX"] ?? status?.settings.postMix}</b></div>
            <div><span>تعداد در هفته</span><b>{(status?.settings.postsPerWeek ?? 4).toLocaleString("fa-IR")}</b></div>
            <div><span>انتشار</span><b>فقط با تأیید دستی</b></div>
            <div><span>ایجنت روزانه</span><b>{status?.settings.agentEnabled ? "روشن" : "خاموش"}</b></div>
            <div><span>اسلاید کاروسل</span><b>{(status?.settings.carouselSlides ?? 3).toLocaleString("fa-IR")}</b></div>
          </div>
        </section>
      </div>

      {result && (
        <section className="panel" style={{ marginTop: 14 }}>
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">نتیجه‌ی اجرا</h2>
              <div className="panel-subtitle">تاریخ‌های ساخته‌شده و خطاهای احتمالی</div>
            </div>
          </div>
          <div className="run-result">
            <span>ساخته‌شده: {result.created.toLocaleString("fa-IR")}</span>
            <span>تصویر: {result.images.toLocaleString("fa-IR")}</span>
            <span>خطای تصویر: {result.imageErrors.toLocaleString("fa-IR")}</span>
            <span>روزهای پر: {result.skipped.toLocaleString("fa-IR")}</span>
          </div>
          {result.dates.length > 0 && (
            <p className="panel-subtitle">تاریخ‌ها: {result.dates.join("، ")}</p>
          )}
          {result.errors.length > 0 && (
            <p className="message-banner error">{result.errors.join(" | ")}</p>
          )}
        </section>
      )}
      <AgentPlanItems />
    </main>
  );
}
