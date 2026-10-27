"use client";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, FORMATS } from "@/lib/categories";
import ItemCard from "@/components/ItemCard";
import type { Item as ContentItem } from "@/lib/types";

type Item = ContentItem & { recordDate: string | null };

function api(path: string, init: RequestInit = {}) {
  return fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
}

const tehranDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState<string>(CATEGORIES[0].key);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api("/api/content");
      if (r.ok) setItems(await r.json());
      else if (r.status === 401) setMsg("دسترسی غیرمجاز، دوباره وارد شوید");
      else if (r.status >= 500) setMsg("اتصال به پایگاه داده برقرار نشد؛ مقدار DATABASE_URL را بررسی کنید.");
      else setMsg("دریافت فهرست محتوا ناموفق بود");
    } catch {
      setMsg("ارتباط با سرور برقرار نشد");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const todayKey = tehranDay(new Date());
  const recordingEndKey = tehranDay(new Date(Date.now() + 2 * 86400000));
  const today = items.filter(i => tehranDay(new Date(i.publishDate)) === todayKey);
  const recording = items.filter(i =>
    i.status !== "READY" && i.status !== "PUBLISHED" && i.recordDate &&
    tehranDay(new Date(i.recordDate)) >= todayKey &&
    tehranDay(new Date(i.recordDate)) <= recordingEndKey
  );
  const upcoming = items.filter(i => i.status !== "PUBLISHED" && tehranDay(new Date(i.publishDate)) > todayKey);
  const categoryItems = items.filter(i => i.category === cat);
  const category = CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[0];
  const readyCount = items.filter(i => i.status === "READY").length;
  const publishedCount = items.filter(i => i.status === "PUBLISHED").length;
  const formatIcon = (format: string) => format === "REEL" ? "▶" : format === "STORY" ? "◉" : "▤";
  const statusLabel = (status: string) => ({
    IDEA: "ایده",
    TO_RECORD: "آماده ضبط",
    READY: "آماده انتشار",
    PUBLISHED: "منتشرشده",
  }[status] ?? status);

  async function aiSuggest(format: string) {
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/ai/suggest", { method: "POST", body: JSON.stringify({ category: cat, format, count: 5 }) });
      const suggestions = await r.json();
      if (!r.ok) {
        setMsg(typeof suggestions.error === "string" ? suggestions.error : "دریافت پیشنهاد ناموفق بود");
        return;
      }

      const last = items.filter(i => i.category === cat)
        .reduce((m, i) => Math.max(m, +new Date(i.publishDate)), Date.now() + 86400000);
      let saved = 0;
      for (const [n, suggestion] of suggestions.entries()) {
        const created = await api("/api/content", { method: "POST", body: JSON.stringify({
          title: suggestion.title, caption: `${suggestion.caption}\n\n${suggestion.hashtags.join(" ")}`,
          script: suggestion.script, category: cat, format,
          publishDate: new Date(last + (n + 1) * 86400000).toISOString(),
        })});
        if (!created.ok) throw new Error("ذخیره یکی از پیشنهادها در برنامه ناموفق بود");
        saved++;
      }
      setMsg(`${saved} پیشنهاد به برنامه اضافه شد`);
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "خطا در دریافت پیشنهاد محتوا");
    } finally {
      setBusy(false);
    }
  }

  async function upload(item: Item, f: File) {
    setMsg("در حال آپلود...");
    try {
      const isVideo = f.type.startsWith("video/");
      const signatureResponse = await api("/api/upload/sign", { method: "POST", body: JSON.stringify({ isVideo }) });
      const signature = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signature.error ?? "دریافت مجوز آپلود ناموفق بود");

      const fd = new FormData();
      fd.append("file", f); fd.append("api_key", signature.apiKey); fd.append("timestamp", signature.timestamp);
      fd.append("signature", signature.signature); fd.append("folder", signature.folder);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
        { method: "POST", body: fd });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || !uploaded.secure_url) {
        throw new Error(uploaded.error?.message ?? "آپلود ناموفق بود");
      }

      const saved = await api("/api/content", {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, mediaUrl: uploaded.secure_url, status: "READY" }),
      });
      if (!saved.ok) throw new Error("فایل آپلود شد اما ثبت آن در برنامه ناموفق بود");
      setMsg("آپلود شد ✅");
      await load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "خطا در آپلود فایل");
    }
  }

  async function publish(id: string) {
    setMsg("در حال انتشار...");
    try {
      const r = await api("/api/instagram/publish", { method: "POST", body: JSON.stringify({ id }) });
      const result = await r.json();
      setMsg(r.ok ? "منتشر شد ✅" : result.error ?? "انتشار ناموفق بود");
      await load();
    } catch {
      setMsg("ارتباط با سرویس انتشار برقرار نشد");
    }
  }

  return (
      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">فضای مدیریت محتوا</div>
            <div className="topbar-date">{new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="بارگذاری دوباره" onClick={load}>↻</button>
            <a href="#categories" className="secondary-button">✦ <span>ساخت ایده با هوش مصنوعی</span></a>
          </div>
        </header>

        {msg && <p role="status" className={`message-banner ${msg.includes("ناموفق") || msg.includes("خطا") || msg.includes("غیرمجاز") ? "error" : ""}`}>{msg}</p>}

        <section className="hero" id="overview">
          <div className="hero-copy">
            <div className="hero-kicker">روایت امروز، ریشه در گذشته</div>
            <h1>قصه‌های ایران را زنده نگه داریم</h1>
            <p>برنامه‌ی انتشار، ضبط و ایده‌های محتوایی نیاکان‌نامه را از یک‌جا دنبال کن.</p>
          </div>
          <div className="hero-ornament" aria-hidden="true">✳</div>
        </section>

        <section className="stats-grid" aria-label="خلاصه‌ی محتوا">
          <article className="stat-card"><div className="stat-top"><span>انتشار امروز</span><span className="stat-icon">◷</span></div><div className="stat-number">{today.length.toLocaleString("fa-IR")}</div><div className="stat-hint">محتوای برنامه‌ریزی‌شده برای امروز</div></article>
          <article className="stat-card"><div className="stat-top"><span>در صف ضبط</span><span className="stat-icon">◉</span></div><div className="stat-number">{recording.length.toLocaleString("fa-IR")}</div><div className="stat-hint">ضبط امروز و دو روز آینده</div></article>
          <article className="stat-card"><div className="stat-top"><span>آماده‌ی انتشار</span><span className="stat-icon">↗</span></div><div className="stat-number">{readyCount.toLocaleString("fa-IR")}</div><div className="stat-hint">فایل آماده در کتابخانه‌ی محتوا</div></article>
          <article className="stat-card"><div className="stat-top"><span>منتشرشده</span><span className="stat-icon">✓</span></div><div className="stat-number">{publishedCount.toLocaleString("fa-IR")}</div><div className="stat-hint">محتواهای منتشرشده‌ی ثبت‌شده</div></article>
        </section>

        <div className="content-grid">
          <div className="content-list-column">
            <section className="panel" id="schedule">
              <div className="panel-heading">
                <div><h2 className="panel-title">برنامه‌ی انتشار امروز</h2><div className="panel-subtitle">محتواهای آماده‌ی انتشار و کارهای باقی‌مانده</div></div>
                <a className="text-link" href="#upcoming">برنامه‌ی پیش‌رو ←</a>
              </div>
              {today.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">✦</span>برای امروز محتوایی در تقویم نیست.<br />از دسته‌بندی‌ها یک ایده‌ی تازه بساز.</div>
              ) : (
                <div className="content-list">{today.map(item => (
                  <article className="content-row" key={item.id}>
                    <span className="format-icon">{formatIcon(item.format)}</span>
                    <div className="row-copy">
                      <div className="row-title">{item.title}</div>
                      <div className="row-meta"><span>{categoryFor(item.category)}</span><span>{item.format}</span></div>
                    </div>
                    <span className={`status-pill ${item.status === "READY" ? "ready" : item.status === "PUBLISHED" ? "published" : item.status === "TO_RECORD" ? "record" : ""}`}>{statusLabel(item.status)}</span>
                    <div className="row-actions">
                      <label className="upload-label">↑ بارگذاری<input type="file" accept="image/*,video/*" aria-label={`بارگذاری رسانه برای ${item.title}`} onChange={e => e.target.files?.[0] && upload(item, e.target.files[0])} /></label>
                      <button className="publish-button" disabled={item.status === "PUBLISHED" || !item.mediaUrl} onClick={() => publish(item.id)}>↗ انتشار</button>
                    </div>
                  </article>
                ))}</div>
              )}
            </section>

            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panel-heading">
                <div><h2 className="panel-title">{category.icon} {category.title}</h2><div className="panel-subtitle">موضوعات و ایده‌های این بخش از طومار</div></div>
                <span className="category-count">{categoryItems.length.toLocaleString("fa-IR")} محتوا</span>
              </div>
              {categoryItems.length === 0 ? (
                <div className="empty-state">هنوز محتوایی در این دسته ثبت نشده است.<br />برای شروع از پیشنهاد هوش مصنوعی کمک بگیر.</div>
              ) : (
                <div className="item-manager-list">{categoryItems.map(item => (
                  <ItemCard key={item.id} item={item} reload={load} onError={setMsg} />
                ))}</div>
              )}
            </section>
          </div>

          <div className="content-side-column">
            <section className="panel" id="categories">
              <div className="panel-heading"><div><h2 className="panel-title">طومار موضوعات</h2><div className="panel-subtitle">روایتت را از کدام فصل آغاز می‌کنی؟</div></div></div>
              <div className="category-list">{CATEGORIES.map(item => (
                <button key={item.key} className={`category-button ${cat === item.key ? "selected" : ""}`} onClick={() => setCat(item.key)}>
                  <span className="category-name"><span>{item.icon}</span>{item.title}</span><span className="category-count">{items.filter(content => content.category === item.key).length.toLocaleString("fa-IR")}</span>
                </button>
              ))}</div>
              <div className="ai-divider" />
              <div className="panel-subtitle" style={{ marginBottom: 9 }}>پیشنهاد ایده برای قالب</div>
              <div className="ai-actions">{FORMATS.map(format => (
                <button key={format} className="ai-button" disabled={busy} onClick={() => aiSuggest(format)}>{busy ? "در حال ساخت…" : `✦ ${format}`}</button>
              ))}</div>
            </section>

            <section className="panel" style={{ marginTop: 14 }}>
              <div className="panel-heading"><div><h2 className="panel-title">نوبت ضبط</h2><div className="panel-subtitle">امروز و دو روز آینده</div></div><span>🎬</span></div>
              {recording.length === 0 ? <div className="empty-state">ضبطی برای این روزها برنامه‌ریزی نشده است.</div> : (
                <div className="timeline">{recording.map(item => (
                  <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div className="timeline-copy"><div className="timeline-title">{item.title}</div><div className="timeline-date">{new Date(item.recordDate!).toLocaleDateString("fa-IR")} · {item.format}</div></div></div>
                ))}</div>
              )}
            </section>

            <section className="panel" id="upcoming" style={{ marginTop: 14 }}>
              <div className="panel-heading"><div><h2 className="panel-title">انتشارهای بعدی</h2><div className="panel-subtitle">محتواهای برنامه‌ریزی‌شده</div></div><span>▦</span></div>
              {upcoming.length === 0 ? <div className="empty-state">انتشار آینده‌ای در تقویم ثبت نشده است.</div> : (
                <div className="timeline">{upcoming.slice(0, 5).map(item => (
                  <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div className="timeline-copy"><div className="timeline-title">{item.title}</div><div className="timeline-date">{new Date(item.publishDate).toLocaleDateString("fa-IR")} · {item.format}</div></div></div>
                ))}</div>
              )}
            </section>
          </div>
        </div>
      </main>
  );
}

function categoryFor(key: string) {
  return CATEGORIES.find(category => category.key === key)?.title ?? key;
}
