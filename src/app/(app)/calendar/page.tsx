"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

type CalendarItem = { id: string; date: string; time: string; period: "MORNING" | "NOON" | "AFTERNOON" | "NIGHT" | null; format: "POST" | "CAROUSEL" | "REEL" | "STORY"; topic: string; category: string; goal: "ATTRACT" | "ENGAGE" | "SAVE" | "SHARE"; hook: string; status: "SUGGESTED" | "DRAFT" | "APPROVED"; sourceTag: string; occasion: string | null; planItemId: string | null };
type Goal = CalendarItem["goal"];

const formatName: Record<CalendarItem["format"], string> = { POST: "پست", CAROUSEL: "کاروسل سه‌اسلایدی", REEL: "ریلز", STORY: "استوری" };
const goalName: Record<Goal, string> = { ATTRACT: "جذب", ENGAGE: "تعامل", SAVE: "ذخیره", SHARE: "اشتراک" };
const periods: Record<NonNullable<CalendarItem["period"]>, string> = { MORNING: "صبح", NOON: "ظهر", AFTERNOON: "عصر", NIGHT: "شب" };
const tehranDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

export default function CalendarPage() {
    const [startDate, setStartDate] = useState(tehranDay(new Date()));
    const [items, setItems] = useState<CalendarItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
        const date = new Date(`${startDate}T12:00:00`);
        date.setDate(date.getDate() + index);
        return date;
    }), [startDate]);

    const load = useCallback(async () => {
        try { const result = await api<{ items: CalendarItem[] }>(`/api/calendar?date=${startDate}`); setItems(result.items); }
        catch (loadError) { setError(loadError instanceof Error ? loadError.message : "دریافت تقویم ناموفق بود."); }
    }, [startDate]);
    useEffect(() => { void load(); }, [load]);

    async function build(action: "build" | "rebuild-day", date?: string) {
        setBusy(true); setError(""); setMessage("");
        try {
            const result = await api<{ items: CalendarItem[]; sourceTag: string }>("/api/calendar", "POST", { action, date: date ?? startDate });
            setMessage(`${result.items.length.toLocaleString("fa-IR")} پیشنهاد ثبت شد · ${result.sourceTag}`); await load();
        } catch (buildError) { setError(buildError instanceof Error ? buildError.message : "ساخت تقویم ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function action(item: CalendarItem, type: "draft" | "plan") {
        setBusy(true); setError(""); setMessage("");
        try {
            await api(`/api/calendar/${item.id}/${type}`, "POST");
            setMessage(type === "draft" ? "پیش‌نویس مستند ساخته شد و نیازمند بازبینی منبع است." : "به برنامه‌ی PlanItem اضافه شد."); await load();
        } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "عملیات ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function setStatus(item: CalendarItem, status: CalendarItem["status"]) {
        try { await api(`/api/calendar/${item.id}`, "PATCH", { status }); await load(); }
        catch (statusError) { setError(statusError instanceof Error ? statusError.message : "تغییر وضعیت ناموفق بود."); }
    }

    return <main className="main-area"><header className="topbar"><div><div className="eyebrow">پیشنهاد بر پایه‌ی الگو و داده‌ی صفحه</div><h1 className="page-title">تقویم محتوایی</h1><div className="topbar-date">پیشنهادها از اصول عمومی و آمار خود صفحه می‌آیند؛ اینستاگرام الگوریتم رسمی خود را منتشر نکرده است.</div></div><div className="top-actions"><button className="primary-button" disabled={busy} onClick={() => build("build")}>{busy ? "در حال ساخت…" : "ساخت تقویم ۷ روزه"}</button></div></header>
        {message && <p className="message-banner" role="status">{message}</p>}{error && <p className="message-banner error" role="alert">{error}</p>}
        <div className="calendar-navigation"><label className="field"><span className="field-label">شروع هفته</span><input className="field-input" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><div className="calendar-legend"><span>۳ ریلز</span><span>۳ کاروسل</span><span>۴ استوری روزانه</span></div></div>
        <div className="calendar-week">{days.map(date => { const key = tehranDay(date); const dayItems = items.filter(item => tehranDay(new Date(item.date)) === key); return <section className="calendar-day" key={key}><header><h2>{date.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Tehran" })}</h2><button className="icon-button" aria-label={`بازسازی ${date.toLocaleDateString("fa-IR")}`} disabled={busy} onClick={() => build("rebuild-day", key)}>↻</button></header>{dayItems.length === 0 ? <div className="calendar-empty">پیشنهادی ثبت نشده است.</div> : dayItems.map(item => <article className="calendar-card" key={item.id}><div className="calendar-card-top"><span className={`calendar-format ${item.format.toLowerCase()}`}>{formatName[item.format]}</span><span className="calendar-time">{item.time}{item.period ? ` · ${periods[item.period]}` : ""}</span></div><h3>{item.topic}</h3><div className="calendar-category">{item.category} · هدف: {goalName[item.goal]}</div><p>{item.hook}</p>{item.occasion && <div className="source-meta">مناسبت: {item.occasion}</div>}<div className="calendar-source">{item.sourceTag}</div><div className="calendar-actions">{!item.planItemId && <><button className="secondary-button" disabled={busy} onClick={() => action(item, "draft")}>تولید پیش‌نویس</button><button className="secondary-button" disabled={busy} onClick={() => action(item, "plan")}>افزودن به برنامه</button></>}{item.status === "SUGGESTED" && <button className="primary-button" disabled={busy} onClick={() => setStatus(item, "DRAFT")}>علامت‌گذاری پیش‌نویس</button>}{item.status === "DRAFT" && <button className="primary-button" disabled={busy} onClick={() => setStatus(item, "APPROVED")}>تأیید برنامه</button>}{item.status === "APPROVED" && <span className="status-pill ready">تأییدشده</span>}</div></article>)}</section>; })}</div>
    </main>;
}
