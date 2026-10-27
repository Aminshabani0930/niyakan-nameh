"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import PlanItemManager from "@/components/PlanItemManager";
import { FORMAT_FA, FORMAT_ICON, STATUS_FA, type Format } from "@/lib/categories";
import type { Item, Status } from "@/lib/types";

const TZ = "Asia/Tehran";
const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: TZ });
const faDay = (date: Date) =>
  date.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

type RunResult = {
  created: number;
  skipped: number;
  images: number;
  imageErrors: number;
  published: number;
  dates: string[];
  errors: string[];
};

export default function PlanPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [range, setRange] = useState(14);
  const [withImages, setWithImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await api<Item[]>("/api/content"));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "دریافت برنامه ناموفق بود");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const start = Date.now();
    return Array.from({ length: range }, (_, index) => new Date(start + index * 86_400_000));
  }, [range]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = dayKey(new Date(item.publishDate));
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const emptyDays = days.filter(date => !grouped.get(dayKey(date))?.length).length;
  const planned = items.filter(item => item.status !== "PUBLISHED").length;

  async function generate() {
    setBusy(true);
    setMsg("");
    try {
      const result = await api<RunResult>("/api/agent/plan", "POST", { days: 7, withImages });
      const parts = [`${result.created.toLocaleString("fa-IR")} محتوا ساخته شد`];
      if (result.images) parts.push(`${result.images.toLocaleString("fa-IR")} تصویر`);
      if (result.imageErrors) parts.push(`${result.imageErrors.toLocaleString("fa-IR")} خطای تصویر`);
      if (result.skipped) parts.push(`${result.skipped.toLocaleString("fa-IR")} روز از قبل پر بود`);
      setMsg(parts.join(" · "));
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "اجرای ایجنت ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main-area">
      <header className="topbar">
        <div>
          <div className="eyebrow">تقویم روایت‌ها</div>
          <h1 className="page-title">برنامه‌ی انتشار</h1>
          <div className="topbar-date">از امروز تا {range.toLocaleString("fa-IR")} روز آینده</div>
        </div>
        <div className="top-actions">
          <select className="item-status-select" value={range} onChange={event => setRange(Number(event.target.value))}>
            <option value={7}>۷ روز</option>
            <option value={14}>۱۴ روز</option>
            <option value={30}>۳۰ روز</option>
          </select>
          <button className="icon-button" aria-label="بارگذاری دوباره" onClick={load}>↻</button>
        </div>
      </header>

      {msg && <p role="status" className={`message-banner ${msg.includes("ناموفق") || msg.includes("خطا") ? "error" : ""}`}>{msg}</p>}

      <PlanItemManager />

      <section className="stats-grid" aria-label="خلاصه‌ی برنامه">
        <article className="stat-card"><div className="stat-top"><span>محتواهای برنامه</span><span className="stat-icon">▦</span></div><div className="stat-number">{planned.toLocaleString("fa-IR")}</div><div className="stat-hint">همه‌ی محتواهای در جریان</div></article>
        <article className="stat-card"><div className="stat-top"><span>روزهای خالی</span><span className="stat-icon">◌</span></div><div className="stat-number">{emptyDays.toLocaleString("fa-IR")}</div><div className="stat-hint">در بازه‌ی نمایش‌داده‌شده</div></article>
        <article className="stat-card"><div className="stat-top"><span>آماده‌ی انتشار</span><span className="stat-icon">✓</span></div><div className="stat-number">{items.filter(item => item.status === "READY").length.toLocaleString("fa-IR")}</div><div className="stat-hint">رسانه‌ی آماده دارند</div></article>
        <article className="stat-card"><div className="stat-top"><span>منتشرشده</span><span className="stat-icon">↗</span></div><div className="stat-number">{items.filter(item => item.status === "PUBLISHED").length.toLocaleString("fa-IR")}</div><div className="stat-hint">در اینستاگرام</div></article>
      </section>

      <section className="panel" style={{ marginTop: 17 }}>
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">پر کردن خودکار برنامه</h2>
            <div className="panel-subtitle">
              ایجنت روزهای خالی هفته‌ی آینده را با محتوای تازه پر می‌کند؛ روزهایی که محتوا دارند دست‌نخورده می‌مانند.
            </div>
          </div>
          <div className="plan-toolbar">
            <label className="toggle-inline">
              <input type="checkbox" checked={withImages} onChange={event => setWithImages(event.target.checked)} />
              ساخت تصویر
            </label>
            <button className="primary-button" disabled={busy} onClick={generate}>
              {busy ? "در حال ساخت…" : "✦ ساخت برنامه‌ی ۷ روزه"}
            </button>
          </div>
        </div>

        <div className="plan-grid">
          {days.map(date => {
            const key = dayKey(date);
            const dayItems = (grouped.get(key) ?? []).sort((a, b) => +new Date(a.publishDate) - +new Date(b.publishDate));
            const isToday = key === dayKey(new Date());
            return (
              <article className={`plan-day${isToday ? " today" : ""}`} key={key}>
                <div className="plan-day-head">
                  <span>{faDay(date)}</span>
                  <small>{dayItems.length ? `${dayItems.length.toLocaleString("fa-IR")} محتوا` : "خالی"}</small>
                </div>
                {dayItems.length === 0 ? (
                  <p className="plan-day-empty">جای یک روایت تازه</p>
                ) : dayItems.map(item => (
                  <div className="plan-item" key={item.id}>
                    <span className="plan-item-icon">{FORMAT_ICON[item.format as Format] ?? "▤"}</span>
                    <div className="plan-item-copy">
                      <div className="plan-item-title">{item.title}</div>
                      <div className="plan-item-meta">
                        {FORMAT_FA[item.format as Format] ?? item.format} · {STATUS_FA[item.status as Status] ?? item.status}
                        {item.imageError ? " · تصویر ناموفق" : item.mediaUrl ? " · تصویر دارد" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
