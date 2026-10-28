"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type PlanType = "POST" | "CAROUSEL" | "REEL" | "STORY";
type PlanStatus = "PLANNED" | "GENERATING" | "DRAFT" | "APPROVED" | "FAILED";
type PlanItem = {
  id: string;
  topic: string;
  publishDate: string;
  type: PlanType;
  tone: string;
  notes: string;
  status: PlanStatus;
  errorMessage: string | null;
  contentId: string | null;
};

type Form = { topic: string; date: string; type: PlanType; tone: string; notes: string };
const emptyForm = (): Form => ({
  topic: "",
  date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  type: "POST",
  tone: "روان و صمیمی",
  notes: "",
});

const statusNames: Record<PlanStatus, string> = {
  PLANNED: "برنامه‌ریزی‌شده",
  GENERATING: "در حال تولید",
  DRAFT: "پیش‌نویس",
  APPROVED: "تأییدشده",
  FAILED: "ناموفق",
};
const typeNames: Record<PlanType, string> = { POST: "پست", CAROUSEL: "کاروسل", REEL: "ریلز", STORY: "استوری" };

function toIsoDate(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

function parseCsvRow(row: string) {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index++) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) {
      value += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value.trim());
  return fields;
}

function latinDigits(value: string) {
  return value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function parseImport(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("متنی برای واردکردن وارد کنید.");
  const rows = lines.map(parseCsvRow);
  const normalize = (value: string) => value.trim().toLowerCase();
  const aliases = {
    topic: ["topic", "موضوع", "عنوان"],
    date: ["date", "publishdate", "تاریخ", "تاریخ انتشار"],
    type: ["type", "نوع"],
    tone: ["tone", "لحن"],
    notes: ["notes", "نکات", "توضیحات"],
  };
  const header = rows[0].map(normalize);
  const hasHeader = Object.values(aliases).some(names => names.some(name => header.includes(normalize(name))));
  const indexOf = (names: string[]) => header.findIndex(key => names.some(name => normalize(name) === key));
  const defaultDate = new Date(Date.now() + 86_400_000);
  const dataRows = hasHeader ? rows.slice(1) : lines.map(line => [line]);

  return dataRows.filter(row => row.some(value => value.trim())).map((row, index) => {
    const topic = hasHeader ? row[indexOf(aliases.topic)] : row[0];
    const dateField = hasHeader && indexOf(aliases.date) >= 0 ? row[indexOf(aliases.date)] : "";
    const parsedDate = dateField ? new Date(latinDigits(dateField)) : new Date(defaultDate.getTime() + index * 86_400_000);
    if (!topic?.trim() || Number.isNaN(parsedDate.getTime())) {
      throw new Error(`موضوع یا تاریخ ردیف ${index + 1} معتبر نیست.`);
    }
    const rawType = hasHeader && indexOf(aliases.type) >= 0 ? row[indexOf(aliases.type)]?.trim().toUpperCase() : "";
    const type: PlanType = rawType === "CAROUSEL" || rawType === "کاروسل"
      ? "CAROUSEL"
      : rawType === "REEL" || rawType === "ریلز" ? "REEL" : "POST";
    return {
      topic: topic.trim(),
      publishDate: parsedDate.toISOString(),
      type,
      tone: hasHeader && row[indexOf(aliases.tone)]?.trim() ? row[indexOf(aliases.tone)].trim() : "روان و صمیمی",
      notes: hasHeader && indexOf(aliases.notes) >= 0 ? row[indexOf(aliases.notes)] ?? "" : "",
    };
  });
}

export default function PlanItemManager() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => setItems(await api<PlanItem[]>("/api/plan-items")), []);
  useEffect(() => { void load().catch(error => setMessage(error instanceof Error ? error.message : "دریافت برنامه ناموفق بود")); }, [load]);

  function edit(item: PlanItem) {
    setEditing(item.id);
    setForm({
      topic: item.topic,
      date: new Date(item.publishDate).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
      type: item.type,
      tone: item.tone,
      notes: item.notes,
    });
  }

  function reset() {
    setEditing(null);
    setForm(emptyForm());
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        topic: form.topic,
        publishDate: toIsoDate(form.date),
        type: form.type,
        tone: form.tone,
        notes: form.notes,
      };
      await api(editing ? `/api/plan-items/${editing}` : "/api/plan-items", editing ? "PATCH" : "POST", payload);
      setMessage(editing ? "تغییرات ذخیره شد." : "آیتم برنامه اضافه شد.");
      reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره‌ی آیتم ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: PlanItem) {
    if (!confirm(`«${item.topic}» حذف شود؟`)) return;
    setBusy(true);
    try {
      await api(`/api/plan-items/${item.id}`, "DELETE");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حذف آیتم ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(item: PlanItem) {
    setBusy(true);
    try {
      await api(`/api/plan-items/${item.id}`, "PATCH", { status: "APPROVED" });
      await load();
      setMessage("پیش‌نویس تأیید شد؛ انتشار همچنان دستی است.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تأیید پیش‌نویس ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function importItems() {
    setBusy(true);
    setMessage("");
    try {
      const imported = parseImport(importText);
      if (imported.length > 100) throw new Error("حداکثر ۱۰۰ آیتم را در هر نوبت وارد کنید.");
      const result = await api<{ created: number }>("/api/plan-items/import", "POST", { items: imported });
      setMessage(`${result.created.toLocaleString("fa-IR")} آیتم وارد شد.`);
      setImportText("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "واردکردن آیتم‌ها ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">آیتم‌های برنامه‌ی ایجنت</h2>
          <div className="panel-subtitle">موضوع‌ها را مدیریت یا از متن ساده و CSV وارد کنید؛ تولید فقط پیش‌نویس می‌سازد.</div>
        </div>
      </div>

      {message && <p role="status" className={`message-banner ${/ناموفق|معتبر نیست|وارد کنید/.test(message) ? "error" : ""}`}>{message}</p>}

      <form className="form-grid" onSubmit={save}>
        <label className="field">
          <span className="field-label">موضوع</span>
          <input className="field-input" required maxLength={500} value={form.topic}
            onChange={event => setForm({ ...form, topic: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">تاریخ انتشار</span>
          <input className="field-input" type="date" required value={form.date}
            onChange={event => setForm({ ...form, date: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">نوع محتوا</span>
          <select className="field-input" value={form.type}
            onChange={event => setForm({ ...form, type: event.target.value as PlanType })}>
            {Object.entries(typeNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">لحن</span>
          <input className="field-input" required maxLength={100} value={form.tone}
            onChange={event => setForm({ ...form, tone: event.target.value })} />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span className="field-label">نکات تکمیلی</span>
          <textarea className="field-input field-textarea" rows={3} value={form.notes}
            onChange={event => setForm({ ...form, notes: event.target.value })} />
        </label>
        <div className="top-actions">
          <button className="primary-button" disabled={busy}>{busy ? "در حال ذخیره…" : editing ? "ذخیره‌ی ویرایش" : "افزودن به برنامه"}</button>
          {editing && <button className="secondary-button" type="button" onClick={reset}>انصراف</button>}
        </div>
      </form>

      <details className="item-details">
        <summary>واردکردن چندتایی از متن یا CSV</summary>
        <p>متن ساده: هر موضوع در یک خط. CSV: ستون‌های topic, date, type, tone, notes (یا عنوان‌های فارسی).</p>
        <textarea className="field-input field-textarea" rows={5} value={importText}
          onChange={event => setImportText(event.target.value)} placeholder={"موضوع اول\nموضوع دوم"} />
        <button className="secondary-button" type="button" disabled={busy || !importText.trim()} onClick={importItems}>
          واردکردن آیتم‌ها
        </button>
      </details>

      <div className="item-manager-list" style={{ marginTop: 14 }}>
        {items.length === 0 ? <div className="empty-state">هنوز آیتمی در برنامه ثبت نشده است.</div> : items.map(item => (
          <article className="item-card" key={item.id}>
            <div className="item-card-main">
              <div>
                <span className="item-format">{typeNames[item.type]}</span>
                <b>{item.topic}</b>
                <div className="item-card-meta">
                  {new Date(item.publishDate).toLocaleDateString("fa-IR", { dateStyle: "long", timeZone: "Asia/Tehran" })}
                  {" · "}{statusNames[item.status]}{" · "}{item.tone}
                </div>
                {item.errorMessage && <div className="analytics-error">{item.errorMessage}</div>}
                {item.contentId && <Link className="text-link" href="/">مشاهده‌ی محتوای پیش‌نویس در داشبورد ←</Link>}
              </div>
              <div className="item-card-actions">
                {(item.status === "PLANNED" || item.status === "FAILED") && <button className="item-action-button" disabled={busy} onClick={() => edit(item)}>ویرایش</button>}
                {item.status === "DRAFT" && <button className="item-action-button primary" disabled={busy} onClick={() => approve(item)}>تأیید</button>}
                {item.status !== "GENERATING" && item.status !== "APPROVED" && <button className="item-action-button danger" disabled={busy} onClick={() => remove(item)}>حذف</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
