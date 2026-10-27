"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Topic = { id: string; title: string; period: string; queries: string[] };
type Entry = { id: string; topicId: string; subject: string; title: string; text: string; confidence: "LOW" | "MEDIUM" | "HIGH"; autoReviewPassed: boolean; reviewNotes: string; unsupportedClaims: string[]; status: "NEEDS_REVIEW" | "APPROVED" | "REJECTED"; citations: { id: string; claim: string; chunkId: string; chunk: { id: string; sequence: number; title: string; text: string; source: { id: string; title: string } } }[]; instagramDrafts: { id: string; type: string; content: Record<string, unknown>; status: string }[] };
type Gap = { topicId: string; title: string; sourceChunks: number; approvedResearch: number; publishedContent: number; missing: string[] };

export default function ResearchPage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [gaps, setGaps] = useState<Gap[]>([]);
    const [topicId, setTopicId] = useState("");
    const [subject, setSubject] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [editing, setEditing] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editText, setEditText] = useState("");
    const [draftType, setDraftType] = useState("CAPTION");

    const load = useCallback(async () => {
        try {
            const [topicRows, entryRows] = await Promise.all([api<Topic[]>("/api/research/topics"), api<Entry[]>("/api/research?all=true")]);
            setTopics(topicRows); setEntries(entryRows);
            if (!topicId && topicRows[0]) setTopicId(topicRows[0].id);
        } catch { setError("دریافت موضوع‌ها یا مطالب پژوهشی ناموفق بود."); }
    }, [topicId]);
    useEffect(() => { void load(); }, [load]);

    async function generate() {
        if (!subject.trim()) { setError("موضوع یا پرسش پژوهش را وارد کنید."); return; }
        setBusy(true); setError(""); setMessage("");
        try {
            await api("/api/research/draft", "POST", { subject, topicId: topicId || undefined });
            setMessage("پیش‌نویس ساخته شد و برای بازبینی انسانی ذخیره شد."); setSubject(""); await load();
        } catch (generateError) { setError(generateError instanceof Error ? generateError.message : "ساخت پیش‌نویس ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function updateEntry(entry: Entry, status?: Entry["status"]) {
        setBusy(true); setError(""); setMessage("");
        try {
            const payload = status ? { status } : { title: editTitle || entry.title, text: editText || entry.text };
            await api(`/api/research/${entry.id}`, "PATCH", payload);
            setEditing(""); setEditTitle(""); setEditText(""); setMessage(status === "APPROVED" ? "مطلب تأیید شد." : status === "REJECTED" ? "مطلب رد شد." : "ویرایش ذخیره شد؛ بازبینی خودکار دوباره لازم است."); await load();
        } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "ذخیره‌ی بازبینی ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function rerunReview(entry: Entry) {
        setBusy(true); setError(""); setMessage("");
        try { const result = await api<{ autoReviewPassed: boolean }>(`/api/research/${entry.id}/review`, "POST"); setMessage(result.autoReviewPassed ? "ارجاع‌ها تأیید خودکار شدند؛ تأیید انسانی همچنان لازم است." : "برخی ارجاع‌ها پشتیبانی نشدند؛ پیش‌نویس تأیید نشد."); await load(); }
        catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "بازبینی خودکار ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function analyzeGaps() {
        setBusy(true); setError("");
        try { const result = await api<{ gaps: Gap[] }>("/api/research/gaps"); setGaps(result.gaps); }
        catch { setError("تحلیل شکاف محتوا ناموفق بود."); }
        finally { setBusy(false); }
    }

    async function makeInstagramDraft(entry: Entry) {
        setBusy(true); setError(""); setMessage("");
        try { await api("/api/research/instagram", "POST", { researchEntryId: entry.id, type: draftType }); setMessage("پیش‌نویس اینستاگرام ذخیره شد؛ انتشار خودکار انجام نشد."); await load(); }
        catch (draftError) { setError(draftError instanceof Error ? draftError.message : "ساخت پیش‌نویس ناموفق بود."); }
        finally { setBusy(false); }
    }

    return <main className="main-area"><header className="topbar"><div><div className="eyebrow">پژوهش با ارجاع</div><h1 className="page-title">ایجنت پژوهشگر</h1><div className="topbar-date">هیچ متنی بدون منبع تأیید نمی‌شود؛ خروجی‌ها ابتدا نیازمند بازبینی‌اند.</div></div><Link className="secondary-button" href="/library">کتابخانه‌ی منابع</Link></header>
        {message && <p className="message-banner" role="status">{message}</p>}{error && <p className="message-banner error" role="alert">{error}</p>}
        <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">ساخت پیش‌نویس مستند</h2><div className="panel-subtitle">هر درخواست یک retrieval و حداکثر دو فراخوانی محدود AI دارد.</div></div></div><div className="form-grid"><label className="field"><span className="field-label">موضوع از data/topics.json</span><select className="field-input" value={topicId} onChange={event => setTopicId(event.target.value)}><option value="">موضوع آزاد</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label><label className="field"><span className="field-label">پرسش یا محدوده‌ی دقیق</span><input className="field-input" value={subject} onChange={event => setSubject(event.target.value)} placeholder="مثلاً منابع درباره‌ی ... چه می‌گویند؟" /></label></div><div className="source-actions"><button className="primary-button" disabled={busy || !subject.trim()} onClick={generate}>{busy ? "در حال پژوهش…" : "ساخت پیش‌نویس"}</button><button className="secondary-button" disabled={busy} onClick={analyzeGaps}>تحلیل شکاف محتوا</button></div></section>
        {gaps.length > 0 && <section className="panel" style={{ marginTop: 14 }}><h2 className="panel-title">موضوع‌های کم‌پوشش</h2><div className="source-list">{gaps.map(gap => <article className="source-row" key={gap.topicId}><div className="source-copy"><h3>{gap.title}</h3><div className="source-meta">بخش منبع: {gap.sourceChunks} · مطلب تأییدشده: {gap.approvedResearch} · محتوای منتشرشده: {gap.publishedContent}</div></div><span className="status-pill record">نیازمند: {gap.missing.join("، ")}</span></article>)}</div></section>}
        <section className="source-list" style={{ marginTop: 14 }}><h2 className="panel-title">صف بازبینی · {entries.length.toLocaleString("fa-IR")}</h2>{entries.map(entry => <article className="panel research-entry" key={entry.id}><div className="panel-heading"><div><div className="source-meta">{entry.topicId} · اطمینان: {entry.confidence} · {entry.status === "APPROVED" ? "تأییدشده" : entry.status === "REJECTED" ? "ردشده" : "نیازمند بازبینی"}</div><h2 className="panel-title">{entry.title}</h2><div className="panel-subtitle">بازبینی خودکار: {entry.autoReviewPassed ? "ارجاع‌ها پشتیبانی شدند" : "تأیید نشده"} · {entry.reviewNotes}</div></div></div>
            {editing === entry.id ? <div className="source-edit"><input className="field-input" value={editTitle} onChange={event => setEditTitle(event.target.value)} /><textarea className="field-input field-textarea" value={editText} onChange={event => setEditText(event.target.value)} /><button className="secondary-button" onClick={() => updateEntry(entry)}>ذخیره و نیاز به بازبینی مجدد</button></div> : <p className="research-text">{entry.text}</p>}
            {entry.unsupportedClaims.length > 0 && <div className="message-banner error">ادعاهای بدون پشتوانه: {entry.unsupportedClaims.join(" · ")}</div>}
            <div className="research-citations">{entry.citations.map(citation => <article className="research-citation" key={citation.id}><div className="source-meta">{citation.chunk.source.title} · بخش {citation.chunk.sequence.toLocaleString("fa-IR")}</div><b>ادعا: {citation.claim}</b><p>{citation.chunk.text.slice(0, 1_000)}{citation.chunk.text.length > 1_000 ? "…" : ""}</p><Link className="text-link" href={`/library/${citation.chunk.source.id}#chunk-${citation.chunk.sequence}`}>بازکردن منبع</Link></article>)}</div>
            <div className="source-actions"><button className="secondary-button" onClick={() => { setEditing(entry.id); setEditTitle(entry.title); setEditText(entry.text); }}>ویرایش</button><button className="secondary-button" disabled={busy || entry.citations.length === 0} onClick={() => rerunReview(entry)}>بازبینی ارجاع‌ها</button><button className="primary-button" disabled={busy || !entry.autoReviewPassed || entry.citations.length === 0} onClick={() => updateEntry(entry, "APPROVED")}>تأیید انسانی</button>{entry.status !== "REJECTED" && <button className="secondary-button" disabled={busy} onClick={() => updateEntry(entry, "REJECTED")}>رد</button>}</div>
            {entry.status === "APPROVED" && <div className="instagram-draft-tools"><select className="field-input" value={draftType} onChange={event => setDraftType(event.target.value)}><option value="CAPTION">کپشن</option><option value="CAROUSEL">کاروسل</option><option value="REEL">ریلز</option><option value="STORY">استوری</option></select><button className="secondary-button" disabled={busy} onClick={() => makeInstagramDraft(entry)}>ساخت پیش‌نویس اینستاگرام</button></div>}
            {entry.instagramDrafts.map(draft => <details className="instagram-preview" key={draft.id}><summary>{draft.type} · {draft.status} · پیش‌نویس با منبع</summary><pre>{JSON.stringify(draft.content, null, 2)}</pre></details>)}
        </article>)}{entries.length === 0 && <div className="empty-state">هنوز پیش‌نویس پژوهشی ثبت نشده است.</div>}</section>
    </main>;
}
