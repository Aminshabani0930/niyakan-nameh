"use client";
import { useState } from "react";
import { api, uploadMedia } from "@/lib/client";
import { catTitle, FORMAT_FA, STATUS_FA, STATUSES } from "@/lib/categories";
import { fa } from "@/lib/time";
import type { Item } from "@/lib/types";

export default function ItemCard({ item, reload, onError }: { item: Item; reload: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : "عملیات ناموفق بود");
    } finally {
      setBusy(false);
    }
  };
  const patch = (d: object) => api(`/api/content/${item.id}`, "PATCH", d);
  const done = item.status === "PUBLISHED";
  const mediaCount = item.mediaUrls.length || (item.mediaUrl ? 1 : 0);

  return (
    <article className="item-card">
      <div className="item-card-main">
        <div>
          <span className="item-format">{FORMAT_FA[item.format]}</span>
          <b>{item.title}</b>
          <div className="item-card-meta">
            {catTitle(item.category)} · {fa(item.publishDate)}
            {mediaCount > 0 && ` · ${mediaCount.toLocaleString("fa-IR")} رسانه`}
          </div>
        </div>
        <div className="item-card-actions">
          <select disabled={busy || done} value={item.status} className="item-status-select"
            onChange={e => run(() => patch({ status: e.target.value }))}>
            {STATUSES.filter(s => s !== "PUBLISHED").map(s => <option key={s} value={s}>{STATUS_FA[s]}</option>)}
          </select>
          {!done && (
            <label className="item-action-button">
              {mediaCount ? "تعویض فایل" : "آپلود فایل"}
              <input type="file" accept="image/*,video/*" hidden disabled={busy} multiple={item.format === "CAROUSEL"}
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  run(async () => {
                    if (item.format === "CAROUSEL" && files.length > 1) {
                      const urls: string[] = [];
                      for (const file of files) urls.push((await uploadMedia(file)).mediaUrl);
                      await patch({ mediaUrls: urls, mediaUrl: urls[0], status: "READY" });
                    } else {
                      const uploaded = await uploadMedia(files[0]);
                      await patch({ ...uploaded, mediaUrls: [uploaded.mediaUrl], status: "READY" });
                    }
                  });
                }} />
            </label>
          )}
          {!done && mediaCount > 0 && (
            <button className="item-action-button primary" disabled={busy} onClick={() => run(() => api("/api/instagram/publish", "POST", { id: item.id }))}>
              انتشار در اینستاگرام
            </button>
          )}
          <button className="item-action-button danger" disabled={busy} onClick={() => confirm("این محتوا حذف شود؟") && run(() => api(`/api/content/${item.id}`, "DELETE"))}>
            حذف
          </button>
        </div>
      </div>
      {(item.script || item.caption) && (
        <details className="item-details">
          <summary>سناریو و کپشن</summary>
          <p><b>سناریو:</b> {item.script}</p>
          <p><b>کپشن:</b> {item.caption}</p>
        </details>
      )}
    </article>
  );
}
