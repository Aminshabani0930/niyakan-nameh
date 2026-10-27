"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { deleteOfflineSource, listOfflineSources, saveOfflineSource, type OfflineSource } from "@/lib/offline-sources";

type SourceType = "SHAHNAMEH" | "HISTORY" | "ARCHITECTURE" | "CYRUS" | "OTHER";
type Period = "MYTHICAL" | "ACHAEMENID" | "PARTHIAN" | "SASANIAN" | "ISLAMIC" | "SAFAVID" | "AFSHARID" | "ZAND" | "QAJAR";
type Source = { id: string; title: string; authorEditor: string; type: SourceType; yearEdition: string; license: string; sourceUrl: string; notes: string; period: Period | null; uploadedAt: string; _count: { chunks: number } };
type Preview = { preview: { sequence: number; title: string; text: string }[]; chunkCount: number; wordCount: number; byteCount: number };

const TYPE_LABEL: Record<SourceType, string> = { SHAHNAMEH: "شاهنامه", HISTORY: "تاریخ", ARCHITECTURE: "معماری", CYRUS: "کوروش", OTHER: "سایر" };
const PERIOD_LABEL: Record<Period, string> = { MYTHICAL: "اساطیری", ACHAEMENID: "هخامنشی", PARTHIAN: "اشکانی", SASANIAN: "ساسانی", ISLAMIC: "دوره‌ی اسلامی", SAFAVID: "صفوی", AFSHARID: "افشار", ZAND: "زند", QAJAR: "قاجار" };

function uploadWithProgress(form: FormData, onProgress: (progress: number) => void) {
    return new Promise<{ source: Source; chunks: number; words: number }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/library/import");
        request.upload.onprogress = event => {
            if (event.lengthComputable) onProgress(Math.min(95, Math.round(event.loaded / event.total * 95)));
        };
        request.onload = () => {
            const response = JSON.parse(request.responseText) as { error?: string; source?: Source; chunks?: number; words?: number };
            if (request.status < 200 || request.status >= 300 || !response.source) return reject(new Error(response.error ?? "ورود فایل ناموفق بود."));
            resolve({ source: response.source, chunks: response.chunks ?? 0, words: response.words ?? 0 });
        };
        request.onerror = () => reject(new Error("ارتباط با سرور برقرار نشد."));
        request.send(form);
    });
}

function highlight(text: string, query: string) {
    if (!query.trim()) return text;
    const terms = query.trim().split(/\s+/).filter(Boolean).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!terms.length) return text;
    return text.split(new RegExp(`(${terms.join("|")})`, "gi")).map((part, index) =>
        terms.some(term => part.toLowerCase() === term.toLowerCase()) ? <mark key={index}>{part}</mark> : part,
    );
}

export default function LibraryPage() {
    const [sources, setSources] = useState<Source[]>([]);
    const [offline, setOffline] = useState<OfflineSource[]>([]);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ id: string; sourceId: string; sequence: number; title: string; text: string; chapterPage: string | null; sourceTitle: string }[]>([]);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [databaseBytes, setDatabaseBytes] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [form, setForm] = useState({ title: "", authorEditor: "", type: "OTHER" as SourceType, yearEdition: "", license: "", sourceUrl: "", notes: "", period: "" as Period | "" });

    const load = useCallback(async () => {
        try {
            const [sourceRows, offlineRows, storage] = await Promise.all([
                api<Source[]>("/api/library"),
                listOfflineSources(),
                api<{ bytes: number | null }>("/api/storage"),
            ]);
            setSources(sourceRows);
            setOffline(offlineRows);
            setDatabaseBytes(storage.bytes);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "دریافت منابع ناموفق بود.");
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const offlineBytes = useMemo(() => offline.reduce((total, source) => total + new Blob([JSON.stringify(source)]).size, 0), [offline]);
    const formData = (isPreview: boolean) => {
        const data = new FormData();
        if (file) data.set("file", file);
        for (const [key, value] of Object.entries(form)) data.set(key, value);
        data.set("preview", String(isPreview));
        data.set("repairRtl", String((document.getElementById("rtl-repair") as HTMLInputElement | null)?.checked ?? false));
        data.set("removeHeaders", String((document.getElementById("remove-headers") as HTMLInputElement | null)?.checked ?? false));
        return data;
    };

    async function inspectFile() {
        if (!file || !form.title.trim() || !form.license.trim()) { setError("نام منبع، مجوز و فایل الزامی است."); return; }
        setBusy(true); setError(""); setMessage(""); setPreview(null);
        try {
            const response = await fetch("/api/library/import", { method: "POST", body: formData(true) });
            const body = await response.json() as Preview & { error?: string };
            if (!response.ok) throw new Error(body.error ?? "پیش‌نمایش فایل ناموفق بود.");
            setPreview(body);
            setMessage(`${body.wordCount.toLocaleString("fa-IR")} واژه، ${body.chunkCount.toLocaleString("fa-IR")} بخش`);
        } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "خواندن فایل ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function saveSource() {
        if (!form.title.trim() || !form.license.trim()) { setError("نام منبع و مجوز الزامی است."); return; }
        setBusy(true); setError(""); setMessage("");
        try {
            if (!file) {
                await api("/api/library", "POST", form);
                setMessage("منبع ثبت شد.");
            } else {
                if (!preview) throw new Error("ابتدا پیش‌نمایش فایل را بررسی کنید.");
                setProgress(1);
                const result = await uploadWithProgress(formData(false), setProgress);
                setProgress(100);
                setMessage(`${result.chunks.toLocaleString("fa-IR")} بخش از ${result.words.toLocaleString("fa-IR")} واژه ذخیره شد.`);
            }
            setFile(null); setPreview(null);
            setForm({ title: "", authorEditor: "", type: "OTHER", yearEdition: "", license: "", sourceUrl: "", notes: "", period: "" });
            await load();
        } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "ذخیره‌ی منبع ناموفق بود."); }
        finally { setBusy(false); setProgress(0); }
    }

    async function search() {
        if (query.trim().length < 2) { setResults([]); return; }
        try {
            const response = await api<{ results: typeof results }>(`/api/library/search?q=${encodeURIComponent(query)}`);
            setResults(response.results);
        } catch (searchError) { setError(searchError instanceof Error ? searchError.message : "جست‌وجو ناموفق بود."); }
    }

    async function saveOffline(sourceId: string) {
        try {
            const source = await api<{ id: string; title: string; chunks: OfflineSource["chunks"] }>(`/api/library/${sourceId}`);
            await saveOfflineSource({ id: source.id, title: source.title, chunks: source.chunks, savedAt: new Date().toISOString() });
            setMessage(`«${source.title}» برای خواندن آفلاین ذخیره شد.`);
            await load();
        } catch (offlineError) { setError(offlineError instanceof Error ? offlineError.message : "ذخیره‌ی آفلاین ناموفق بود."); }
    }

    async function removeSource(id: string) {
        if (!window.confirm("منبع و بخش‌های آن از دیتابیس حذف شود؟ نسخه‌ی آفلاین دستگاه جداگانه باقی می‌ماند.")) return;
        try { await api(`/api/library/${id}`, "DELETE"); await load(); }
        catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "حذف منبع ناموفق بود."); }
    }

    return (
        <main className="main-area">
            <header className="topbar"><div><div className="eyebrow">مستند، قابل جست‌وجو، آفلاین</div><h1 className="page-title">کتابخانه‌ی منابع</h1><div className="topbar-date">{sources.length.toLocaleString("fa-IR")} منبع · {offline.length.toLocaleString("fa-IR")} آفلاین · {(offlineBytes / 1024 / 1024).toFixed(2)} مگابایت در این دستگاه</div></div><Link className="secondary-button" href="/library/architecture">معماری ایران</Link></header>
            {message && <p className="message-banner" role="status">{message}</p>}{error && <p className="message-banner error" role="alert">{error}</p>}
            <section className="panel source-search"><div className="panel-heading"><div><h2 className="panel-title">جست‌وجو در متن منابع</h2><div className="panel-subtitle">جست‌وجوی تمام‌متن با یکسان‌سازی حروف و ارقام فارسی</div></div></div><div className="source-search-row"><input className="field-input" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && void search()} placeholder="عبارت یا چند واژه…" /><button className="primary-button" onClick={search}>جست‌وجو</button></div>{results.length > 0 && <div className="source-results">{results.map(result => <article className="source-result" key={result.id}><Link href={`/library/${result.sourceId}#chunk-${result.sequence}`} className="text-link">{result.sourceTitle} · بخش {result.sequence.toLocaleString("fa-IR")}</Link><p>{highlight(result.text.slice(0, 650), query)}{result.text.length > 650 ? "…" : ""}</p></article>)}</div>}</section>

            <section className="panel" style={{ marginTop: 14 }}><div className="panel-heading"><div><h2 className="panel-title">افزودن منبع</h2><div className="panel-subtitle">مصرف فعلی دیتابیس: {databaseBytes === null ? "در دسترس نیست" : `${(databaseBytes / 1024 / 1024).toFixed(1)} مگابایت`} · آپلود مرورگر حداکثر ۵ مگابایت است.</div></div></div>
                <div className="form-grid">
                    <label className="field"><span className="field-label">نام منبع *</span><input className="field-input" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /></label>
                    <label className="field"><span className="field-label">مجوز *</span><input className="field-input" value={form.license} onChange={event => setForm({ ...form, license: event.target.value })} placeholder="مثلاً مالکیت عمومی، مجوز ناشر…" required /></label>
                    <label className="field"><span className="field-label">نوع منبع</span><select className="field-input" value={form.type} onChange={event => setForm({ ...form, type: event.target.value as SourceType })}>{Object.entries(TYPE_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <label className="field"><span className="field-label">دوره‌ی تاریخی</span><select className="field-input" value={form.period} onChange={event => setForm({ ...form, period: event.target.value as Period | "" })}><option value="">بدون برچسب دوره</option>{Object.entries(PERIOD_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <label className="field"><span className="field-label">نویسنده / مصحح</span><input className="field-input" value={form.authorEditor} onChange={event => setForm({ ...form, authorEditor: event.target.value })} /></label>
                    <label className="field"><span className="field-label">سال / نسخه</span><input className="field-input" value={form.yearEdition} onChange={event => setForm({ ...form, yearEdition: event.target.value })} /></label>
                    <label className="field"><span className="field-label">نشانی منبع</span><input className="field-input" type="url" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} dir="ltr" /></label>
                    <label className="field"><span className="field-label">فایل متن</span><input className="field-input" type="file" accept=".txt,.md,.json,.csv,.docx,.pdf" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} /><span className="field-hint">TXT، MD، JSON، CSV، DOCX، PDF متنی؛ هر فایل حداکثر ۵MB</span></label>
                    <label className="field"><span className="field-label">یادداشت</span><textarea className="field-input field-textarea" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
                </div>
                {file && file.size > 1024 * 1024 && <p className="message-banner">این فایل {(file.size / 1024 / 1024).toFixed(1)} مگابایت است و متن استخراج‌شده به دیتابیس اضافه می‌شود. پیش از ورود، فضای باقی‌مانده‌ی طرح Neon را بررسی کنید.</p>}
                {file && <div className="toggle-list"><label className="toggle-row"><input id="rtl-repair" type="checkbox" /><span>تصحیح ترتیب حروف/کلمات فارسی PDF (فقط اگر متن استخراج‌شده وارونه است)</span></label><label className="toggle-row"><input id="remove-headers" type="checkbox" /><span>حذف شماره‌صفحه‌ها و سرصفحه‌های تکراری</span></label></div>}
                <div className="plan-toolbar">{file && <button className="secondary-button" disabled={busy} onClick={inspectFile}>{busy ? "در حال خواندن…" : "پیش‌نمایش بخش‌ها"}</button>}<button className="primary-button" disabled={busy || Boolean(file && !preview)} onClick={saveSource}>{busy ? "در حال ذخیره…" : file ? "ذخیره‌ی منبع و بخش‌ها" : "ثبت منبع"}</button></div>
                {progress > 0 && <progress className="source-progress" max={100} value={progress} aria-label="پیشرفت ذخیره‌ی منبع" />}
                {preview && <div className="source-preview"><div className="panel-subtitle">پیش‌نمایش {preview.preview.length.toLocaleString("fa-IR")} بخش نخست · {preview.wordCount.toLocaleString("fa-IR")} واژه</div>{preview.preview.map(chunk => <article key={chunk.sequence}><h3>{chunk.sequence.toLocaleString("fa-IR")} · {chunk.title}</h3><p>{chunk.text}</p></article>)}</div>}
            </section>

            <section className="panel" style={{ marginTop: 14 }}><div className="panel-heading"><div><h2 className="panel-title">شاهنامه</h2><div className="panel-subtitle">متن فقط از فایل واردشده‌ی شما خوانده می‌شود؛ در غیر این صورت «هنوز بارگذاری نشده» نمایش می‌یابد.</div></div><Link className="secondary-button" href="/library/shahnameh">خواندن شاهنامه</Link></div><ShahnamehImport onDone={load} /></section>

            <section className="panel" style={{ marginTop: 14 }}><div className="panel-heading"><div><h2 className="panel-title">منابع ثبت‌شده</h2><div className="panel-subtitle">متن منبع برای خواندن و ارجاع؛ حذف منبع، بخش‌های وابسته را نیز حذف می‌کند.</div></div></div>{sources.length ? <div className="source-list">{sources.map(source => <article className="source-row" key={source.id}><div className="source-copy"><h3>{source.title}</h3><div className="source-meta">{TYPE_LABEL[source.type]} · {source._count.chunks.toLocaleString("fa-IR")} بخش{source.period ? ` · ${PERIOD_LABEL[source.period]}` : ""}{source.authorEditor ? ` · ${source.authorEditor}` : ""}</div><div className="source-meta">مجوز: {source.license}</div></div><div className="source-actions"><Link className="secondary-button" href={`/library/${source.id}`}>خواندن</Link><button className="secondary-button" onClick={() => saveOffline(source.id)}>{offline.some(item => item.id === source.id) ? "به‌روزرسانی آفلاین" : "ذخیره برای آفلاین"}</button><button className="icon-button" aria-label={`حذف ${source.title}`} onClick={() => removeSource(source.id)}>×</button></div></article>)}</div> : <div className="empty-state">هنوز منبعی ثبت نشده است.</div>}</section>

            {offline.length > 0 && <section className="panel" style={{ marginTop: 14 }}><div className="panel-heading"><div><h2 className="panel-title">ذخیره‌های این دستگاه</h2><div className="panel-subtitle">{(offlineBytes / 1024 / 1024).toFixed(2)}MB در IndexedDB مرورگر</div></div></div><div className="source-list">{offline.map(item => <article className="source-row" key={item.id}><div className="source-copy"><h3>{item.title}</h3><div className="source-meta">{item.chunks.length.toLocaleString("fa-IR")} بخش</div></div><div className="source-actions"><a className="secondary-button" href={`/library-offline.html?source=${encodeURIComponent(item.id)}`}>خواندن آفلاین</a><button className="icon-button" aria-label={`حذف نسخه‌ی آفلاین ${item.title}`} onClick={async () => { await deleteOfflineSource(item.id); await load(); }}>×</button></div></article>)}</div></section>}
        </main>
    );
}

function ShahnamehImport({ onDone }: { onDone: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    async function importFile() {
        if (!file) return;
        setBusy(true); setMessage("");
        try {
            const data = new FormData(); data.set("file", file);
            const response = await fetch("/api/library/shahnameh/import", { method: "POST", body: data });
            const result = await response.json() as { error?: string; total?: number };
            if (!response.ok) throw new Error(result.error ?? "ورود شاهنامه ناموفق بود.");
            setMessage(`${(result.total ?? 0).toLocaleString("fa-IR")} بیت پردازش شد.`); setFile(null); onDone();
        } catch (error) { setMessage(error instanceof Error ? error.message : "ورود ناموفق بود."); }
        finally { setBusy(false); }
    }
    return <div className="source-search-row"><input className="field-input" type="file" accept=".json,.csv" onChange={event => setFile(event.target.files?.[0] ?? null)} /><button className="secondary-button" disabled={!file || busy} onClick={importFile}>{busy ? "در حال ورود…" : "ورود JSON / CSV"}</button>{message && <span role="status">{message}</span>}</div>;
}
