"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { api } from "@/lib/client";
import { CATEGORIES, FORMATS, FORMAT_FA, STATUSES, STATUS_FA } from "@/lib/categories";
import type { Item } from "@/lib/types";

export default function ContentPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await api<Item[]>("/api/content"));
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "دریافت محتوا ناموفق بود");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter(item => {
    if (category !== "all" && item.category !== category) return false;
    if (format !== "all" && item.format !== format) return false;
    if (status !== "all" && item.status !== status) return false;
    if (query.trim() && !`${item.title} ${item.caption} ${item.script}`.includes(query.trim())) return false;
    return true;
  }), [items, category, format, status, query]);

  return (
    <main className="main-area">
      <header className="topbar">
        <div>
          <div className="eyebrow">کتابخانه‌ی روایت‌ها</div>
          <h1 className="page-title">محتوا</h1>
          <div className="topbar-date">{filtered.length.toLocaleString("fa-IR")} محتوا از {items.length.toLocaleString("fa-IR")} محتوا</div>
        </div>
        <div className="top-actions">
          <button className="icon-button" aria-label="بارگذاری دوباره" onClick={load}>↻</button>
        </div>
      </header>

      {msg && <p role="status" className="message-banner error">{msg}</p>}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">همه‌ی محتواها</h2>
            <div className="panel-subtitle">جست‌وجو، فیلتر، تغییر وضعیت، آپلود رسانه و انتشار</div>
          </div>
        </div>

        <div className="filters">
          <input className="login-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="جست‌وجو در عنوان، کپشن و سناریو…" aria-label="جست‌وجو" />
          <select className="item-status-select" value={category} onChange={event => setCategory(event.target.value)} aria-label="دسته">
            <option value="all">همه‌ی دسته‌ها</option>
            {CATEGORIES.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}
          </select>
          <select className="item-status-select" value={format} onChange={event => setFormat(event.target.value)} aria-label="قالب">
            <option value="all">همه‌ی قالب‌ها</option>
            {FORMATS.map(value => <option key={value} value={value}>{FORMAT_FA[value]}</option>)}
          </select>
          <select className="item-status-select" value={status} onChange={event => setStatus(event.target.value)} aria-label="وضعیت">
            <option value="all">همه‌ی وضعیت‌ها</option>
            {STATUSES.map(value => <option key={value} value={value}>{STATUS_FA[value]}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">محتوایی با این فیلترها پیدا نشد.</div>
        ) : (
          <div className="item-manager-list">
            {filtered.map(item => <ItemCard key={item.id} item={item} reload={load} onError={setMsg} />)}
          </div>
        )}
      </section>
    </main>
  );
}
