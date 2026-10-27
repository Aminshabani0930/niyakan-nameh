"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Section = "BIOGRAPHY" | "TIMELINE" | "CONQUESTS" | "CYRUS_CYLINDER" | "PASARGADAE" | "SOURCES" | "LATER_TRADITIONS" | "GALLERY" | "Q_AND_A";
type Entry = { id: string; section: Section; title: string; text: string; status: "NEEDS_REVIEW" | "APPROVED"; order: number; imageUrl: string | null; citations: { chunk: { id: string; sequence: number; title: string; text: string; source: { id: string; title: string } } }[] };
type Source = { id: string; title: string; type: string };
type Chunk = { id: string; sequence: number; title: string };
type Published = { id: string; title: string; caption: string; publishDate: string; igMediaId: string | null; mediaUrl: string | null; format: string };

const tabs: { key: Section | "INSTAGRAM"; label: string }[] = [
    { key: "BIOGRAPHY", label: "زندگی‌نامه" }, { key: "TIMELINE", label: "خط زمانی" }, { key: "CONQUESTS", label: "فتوحات" },
    { key: "CYRUS_CYLINDER", label: "منشور کوروش" }, { key: "PASARGADAE", label: "پاسارگاد و آرامگاه" },
    { key: "SOURCES", label: "کوروش در منابع" }, { key: "LATER_TRADITIONS", label: "شاهنامه و روایت‌ها" },
    { key: "GALLERY", label: "نگارخانه" }, { key: "Q_AND_A", label: "پرسش‌وپاسخ" }, { key: "INSTAGRAM", label: "پست‌های اینستاگرام" },
];

export default function CyrusPage() {
    const [tab, setTab] = useState<Section | "INSTAGRAM">("BIOGRAPHY");
    const [entries, setEntries] = useState<Entry[]>([]);
    const [allEntries, setAllEntries] = useState<Entry[]>([]);
    const [published, setPublished] = useState<Published[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [sourceId, setSourceId] = useState("");
    const [editId, setEditId] = useState("");
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [chunkId, setChunkId] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const [approved, review, sourceRows] = await Promise.all([
                api<Entry[]>(`/api/cyrus?section=${tab === "INSTAGRAM" ? "BIOGRAPHY" : tab}`),
                api<Entry[]>("/api/cyrus?all=true"),
                api<Source[]>("/api/library"),
            ]);
            setEntries(approved.filter(entry => entry.status === "APPROVED"));
            setAllEntries(review.filter(entry => entry.status === "NEEDS_REVIEW"));
            setSources(sourceRows.filter(source => source.type === "CYRUS"));
            if (tab === "INSTAGRAM") setPublished(await api<Published[]>("/api/cyrus/instagram"));
        } catch { setError("دریافت بخش کوروش ناموفق بود."); }
    }, [tab]);
    useEffect(() => { void load(); }, [load]);

    async function selectSource(id: string) {
        setSourceId(id); setChunkId(""); setChunks([]);
        if (!id) return;
        try { const source = await api<{ chunks: Chunk[] }>(`/api/library/${id}`); setChunks(source.chunks); }
        catch { setError("دریافت بخش‌های منبع ناموفق بود."); }
    }

    async function saveEntry(status?: Entry["status"]) {
        setBusy(true); setError(""); setMessage("");
        try {
            if (editId) {
                await api(`/api/cyrus/${editId}`, "PATCH", { title, text });
                setMessage("مدخل ویرایش شد و برای تأیید باقی ماند.");
            } else {
                if (!sources.length) throw new Error("ابتدا منبع بارگذاری کنید.");
                await api("/api/cyrus", "POST", { section: tab === "INSTAGRAM" ? "BIOGRAPHY" : tab, title, text, chunkIds: chunkId ? [chunkId] : [] });
                setMessage("پیش‌نویس ذخیره شد؛ برای نمایش باید ارجاع معتبر داشته باشد و تأیید شود.");
            }
            setTitle(""); setText(""); setChunkId(""); setEditId(""); await load();
            if (status) setMessage("پیش‌نویس ذخیره شد و نیازمند بازبینی است.");
        } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "ذخیره‌ی مدخل ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function review(entry: Entry, status: Entry["status"]) {
        try { await api(`/api/cyrus/${entry.id}`, "PATCH", { status }); setMessage(status === "APPROVED" ? "مدخل تأیید و در صفحه نمایش داده شد." : "مدخل به بازبینی برگشت."); await load(); }
        catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "به‌روزرسانی وضعیت ناموفق بود."); }
    }

    async function draftWithAi() {
        setError(""); setMessage("");
        if (!sources.length) { setMessage("ابتدا منبع بارگذاری کنید."); return; }
        setBusy(true);
        try {
            const result = await api<{ title: string; text: string }>("/api/research/draft", "POST", { subject: "کوروش", section: tab });
            setTitle(result.title); setText(result.text); setMessage("پیش‌نویس پژوهشی آماده‌ی ویرایش است؛ هنوز ذخیره یا تأیید نشده.");
        } catch (draftError) { setError(draftError instanceof Error ? draftError.message : "تولید پیش‌نویس پژوهشی ناموفق بود."); }
        finally { setBusy(false); }
    }

    const activeEntries = tab === "INSTAGRAM" ? [] : entries.filter(entry => entry.section === tab);
    return (
        <main className="main-area cyrus-page">
            <section className="cyrus-hero">
                <Image src="/brand/relief-hero-900.webp" alt="نقش‌برجسته‌ی هخامنشی" fill sizes="(max-width: 760px) 100vw, 75vw" priority />
                <div className="cyrus-hero-shade" />
                <div className="cyrus-hero-copy"><div className="hero-kicker">تاریخ، روایت، سند</div><h1>کوروش، پادشاه جهان</h1><p>روایت‌های تأییدشده با ارجاع به منابع کتابخانه</p></div>
            </section>
            <div className="cyrus-tabs" role="tablist" aria-label="بخش‌های کوروش">
                {tabs.map(item => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}
            </div>
            {message && <p className="message-banner" role="status">{message}</p>}
            {error && <p className="message-banner error" role="alert">{error}</p>}
            {tab !== "INSTAGRAM" && (
                <section className="cyrus-entry-list">
                    {activeEntries.map(entry => (
                        <article className="panel cyrus-entry" key={entry.id}>
                            <h2 className="panel-title">{entry.title}</h2>
                            <p>{entry.text}</p>
                            {entry.imageUrl && <Image src={entry.imageUrl} alt={entry.title} width={900} height={600} className="cyrus-entry-image" />}
                            {entry.citations.map(citation => <Link className="source-citation" href={`/library/${citation.chunk.source.id}#chunk-${citation.chunk.sequence}`} key={citation.chunk.id}>منبع: {citation.chunk.source.title}، بخش {citation.chunk.sequence.toLocaleString("fa-IR")}</Link>)}
                        </article>
                    ))}
                    {tab === "GALLERY" && activeEntries.filter(entry => entry.imageUrl).map(entry => <article key={`gallery-${entry.id}`} className="panel"><Image src={entry.imageUrl!} alt={entry.title} width={900} height={600} className="cyrus-entry-image" /><p>{entry.title}</p></article>)}
                    {activeEntries.length === 0 && <div className="empty-state">هنوز مطلب تأییدشده‌ای در این بخش نیست.</div>}
                </section>
            )}
            {tab === "INSTAGRAM" && (
                <section className="cyrus-entry-list">
                    {published.map(item => <article key={item.id} className="panel"><h2 className="panel-title">{item.title}</h2><div className="source-meta">{item.format} · {new Date(item.publishDate).toLocaleDateString("fa-IR")}</div><p>{item.caption}</p>{item.mediaUrl && <a className="text-link" href={item.mediaUrl} target="_blank" rel="noreferrer">رسانه‌ی منتشرشده</a>}{item.igMediaId && <span className="source-meta">شناسه‌ی رسانه‌ی اینستاگرام: {item.igMediaId}</span>}</article>)}
                    {published.length === 0 && <div className="empty-state">پست منتشرشده‌ای با موضوع کوروش در برنامه پیدا نشد.</div>}
                </section>
            )}
            <section className="panel cyrus-management">
                <div className="panel-heading"><div><h2 className="panel-title">مدیریت مدخل‌ها</h2><div className="panel-subtitle">هر مدخل تا زمان بازبینی و تأیید نمایش داده نمی‌شود.</div></div><Link className="secondary-button" href="/library">افزودن منبع نوع کوروش</Link></div>
                <button className="secondary-button" disabled={busy} onClick={draftWithAi}>{busy ? "در حال پژوهش…" : "✦ تولید پیش‌نویس با AI"}</button>
                <div className="form-grid" style={{ marginTop: 12 }}>
                    <label className="field"><span className="field-label">عنوان</span><input className="field-input" value={title} onChange={event => setTitle(event.target.value)} /></label>
                    <label className="field"><span className="field-label">بخش منبع کوروش</span><select className="field-input" value={chunkId} onChange={event => setChunkId(event.target.value)}><option value="">انتخاب ارجاع</option>{chunks.map(chunk => <option key={chunk.id} value={chunk.id}>{chunk.sequence} · {chunk.title}</option>)}</select></label>
                    <label className="field"><span className="field-label">انتخاب منبع نوع کوروش</span><select className="field-input" value={sourceId} onChange={event => selectSource(event.target.value)}><option value="">منبع</option>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select></label>
                    <label className="field"><span className="field-label">متن</span><textarea className="field-input field-textarea" rows={5} value={text} onChange={event => setText(event.target.value)} /></label>
                </div>
                <button className="primary-button" disabled={busy || !title.trim() || !text.trim()} onClick={() => saveEntry()}>{editId ? "ذخیره‌ی ویرایش" : "افزودن پیش‌نویس"}</button>
                {allEntries.length > 0 && <div className="source-list" style={{ marginTop: 18 }}><h3 className="panel-title">در انتظار بازبینی ({allEntries.length.toLocaleString("fa-IR")})</h3>{allEntries.map(entry => <article className="source-row" key={entry.id}><div className="source-copy"><h3>{entry.title}</h3><p>{entry.text}</p><div className="source-meta">{entry.citations.map(citation => `${citation.chunk.source.title}، بخش ${citation.chunk.sequence}`).join(" · ") || "بدون ارجاع"}</div></div><div className="source-actions"><button className="secondary-button" onClick={() => { setEditId(entry.id); setTitle(entry.title); setText(entry.text); }}>ویرایش</button><button className="primary-button" disabled={entry.citations.length === 0} onClick={() => review(entry, "APPROVED")}>تأیید</button><button className="secondary-button" onClick={() => review(entry, "NEEDS_REVIEW")}>رد / نگه‌داری</button></div></article>)}</div>}
            </section>
        </main>
    );
}
