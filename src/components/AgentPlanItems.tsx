"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type PlanItem = {
  id: string;
  topic: string;
  publishDate: string;
  status: "PLANNED" | "GENERATING" | "DRAFT" | "APPROVED" | "FAILED";
  errorMessage: string | null;
  contentId: string | null;
};

const label: Record<PlanItem["status"], string> = {
  PLANNED: "برنامه‌ریزی‌شده",
  GENERATING: "در حال تولید",
  DRAFT: "پیش‌نویس",
  APPROVED: "تأییدشده",
  FAILED: "ناموفق",
};

export default function AgentPlanItems() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => setItems(await api<PlanItem[]>("/api/plan-items")), []);
  useEffect(() => {
    void load().catch(error => setMessage(error instanceof Error ? error.message : "دریافت آیتم‌ها ناموفق بود."));
  }, [load]);

  async function generate(payload: { id: string } | { futureWeek: true }) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ results: { ok: boolean; message?: string }[] }>("/api/agent/generate", "POST", payload);
      const succeeded = result.results.filter(item => item.ok).length;
      const failed = result.results.length - succeeded;
      setMessage(`${succeeded.toLocaleString("fa-IR")} پیش‌نویس ساخته شد${failed ? `؛ ${failed.toLocaleString("fa-IR")} مورد ناموفق بود.` : "."}`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تولید محتوا ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">تولید آیتم‌های برنامه</h2>
          <div className="panel-subtitle">تولید فقط پیش‌نویس می‌سازد؛ انتشار بدون تأیید دستی انجام نمی‌شود.</div>
        </div>
        <div className="top-actions">
          <Link className="text-link" href="/plan">مدیریت برنامه ←</Link>
          <button className="primary-button" disabled={busy} onClick={() => generate({ futureWeek: true })}>
            {busy ? "در حال تولید…" : "تولید آیتم‌های هفته‌ی آینده"}
          </button>
        </div>
      </div>
      {message && <p role="status" className="message-banner">{message}</p>}
      <div className="item-manager-list">
        {items.length === 0 ? <div className="empty-state">برای شروع، در صفحه‌ی برنامه آیتم اضافه کنید.</div> : items.map(item => (
          <article className="item-card" key={item.id}>
            <div className="item-card-main">
              <div>
                <b>{item.topic}</b>
                <div className="item-card-meta">
                  {new Date(item.publishDate).toLocaleDateString("fa-IR", { dateStyle: "long", timeZone: "Asia/Tehran" })}
                  {" · "}{label[item.status]}
                </div>
                {item.errorMessage && <div className="analytics-error">{item.errorMessage}</div>}
                {item.contentId && <Link className="text-link" href="/">نمایش پیش‌نویس در داشبورد ←</Link>}
              </div>
              {(item.status === "PLANNED" || item.status === "FAILED") && (
                <button className="item-action-button primary" disabled={busy} onClick={() => generate({ id: item.id })}>
                  تولید
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
