"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Entry = { id: string; name: string; period: string; cityProvince: string; style: string; features: string[]; status: "NEEDS_REVIEW" | "APPROVED"; sources: { source: { id: string; title: string } }[] };
type SourceOption = { id: string; title: string; type: string };

export default function ArchitecturePage() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [sources, setSources] = useState<SourceOption[]>([]);
    const [all, setAll] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [form, setForm] = useState({ name: "", period: "", cityProvince: "", style: "", features: "", sourceIds: [] as string[] });

    async function load() {
        try { const [entryRows, sourceRows] = await Promise.all([api<Entry[]>(`/api/architecture${all ? "?all=true" : ""}`), api<SourceOption[]>("/api/library")]); setEntries(entryRows); setSources(sourceRows); }
        catch { setError("دریافت فهرست معماری ناموفق بود."); }
    }
    useEffect(() => { void load(); }, [all]);

    async function create() {
        setError(""); setMessage("");
        try {
            await api("/api/architecture", "POST", { ...form, features: form.features.split("\n").map(item => item.trim()).filter(Boolean) });
            setMessage("پیش‌نویس معماری برای بازبینی ذخیره شد."); setForm({ name: "", period: "", cityProvince: "", style: "", features: "", sourceIds: [] }); await load();
        } catch (createError) { setError(createError instanceof Error ? createError.message : "ذخیره‌ی اثر معماری ناموفق بود."); }
    }
    async function review(entry: Entry, status: Entry["status"]) {
        try { await api(`/api/architecture/${entry.id}`, "PATCH", { status }); setMessage(status === "APPROVED" ? "اثر تأیید شد." : "اثر برای بازبینی نگه داشته شد."); await load(); }
        catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "به‌روزرسانی وضعیت ناموفق بود."); }
    }

    return <main className="main-area"><header className="topbar"><div><Link href="/library" className="text-link">← کتابخانه</Link><h1 className="page-title">معماری ایران</h1><div className="topbar-date">هر مدخل به یک یا چند منبع کتابخانه پیوند دارد.</div></div><label className="toggle-inline"><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} />نمایش موارد نیازمند بازبینی</label></header>{message && <p className="message-banner">{message}</p>}{error && <p className="message-banner error">{error}</p>}
        <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">ثبت مدخل دستی</h2><div className="panel-subtitle">هر مدخل ابتدا نیازمند بازبینی است و بدون منبع تأیید نمی‌شود.</div></div></div><div className="form-grid"><label className="field"><span className="field-label">نام اثر</span><input className="field-input" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label className="field"><span className="field-label">دوره</span><input className="field-input" value={form.period} onChange={event => setForm({ ...form, period: event.target.value })} /></label><label className="field"><span className="field-label">شهر / استان</span><input className="field-input" value={form.cityProvince} onChange={event => setForm({ ...form, cityProvince: event.target.value })} /></label><label className="field"><span className="field-label">سبک</span><input className="field-input" value={form.style} onChange={event => setForm({ ...form, style: event.target.value })} /></label><label className="field"><span className="field-label">ویژگی‌ها، هرکدام در یک خط</span><textarea className="field-input field-textarea" value={form.features} onChange={event => setForm({ ...form, features: event.target.value })} /></label><label className="field"><span className="field-label">منابع * (Ctrl برای چندگزینه‌ای)</span><select className="field-input" multiple value={form.sourceIds} onChange={event => setForm({ ...form, sourceIds: Array.from(event.target.selectedOptions, option => option.value) })}>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select></label></div><button className="primary-button" onClick={create}>ذخیره برای بازبینی</button></section>
        <section className="architecture-grid" style={{ marginTop: 14 }}>{entries.map(entry => <article className="panel" key={entry.id}><div className="panel-heading"><div><h2 className="panel-title"><Link href={`/library/architecture/${entry.id}`}>{entry.name}</Link></h2><div className="panel-subtitle">{entry.period} · {entry.cityProvince || "مکان ثبت نشده"} · {entry.status === "APPROVED" ? "تأییدشده" : "نیازمند بازبینی"}</div></div></div><p>{entry.style}</p><ul>{entry.features.map((feature, index) => <li key={index}>{feature}</li>)}</ul><div className="source-meta">منابع: {entry.sources.map(item => item.source.title).join("، ")}</div>{entry.status === "NEEDS_REVIEW" && <div className="source-actions"><button className="primary-button" onClick={() => review(entry, "APPROVED")}>تأیید</button><button className="secondary-button" onClick={() => review(entry, "NEEDS_REVIEW")}>نگه‌داشتن برای بازبینی</button></div>}</article>)}</section>{entries.length === 0 && <div className="empty-state">هنوز مدخل معماری ثبت نشده است.</div>}</main>;
}
