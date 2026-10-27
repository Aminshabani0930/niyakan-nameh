"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { CATEGORIES } from "@/lib/categories";

type Row = { id: string; title: string; format: string; category: string; reach: number;
  likes: number; comments: number; saved: number; shares: number; interactions: number; error?: string };

export default function Analytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [followers, setFollowers] = useState<number | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/instagram/analytics");
      const d = await r.json();
      if (!r.ok) {
        setError(typeof d.error === "string" ? d.error : "دریافت آمار ناموفق بود");
        return;
      }
      setRows(d.rows);
      setFollowers(d.account?.acc?.followers_count ?? null);
      setError(d.accountError ?? "");
      setUpdated(new Date());
    } catch {
      setError("ارتباط با سرویس آمار برقرار نشد");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); const t = setInterval(load, 5 * 60 * 1000); return () => clearInterval(t); }, []);

  const total = (k: keyof Row) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const data = [...rows].reverse().map(r => ({ ...r, name: r.title.slice(0, 18) }));

  const byCat: Record<string, number> = {};
  rows.forEach(r => (byCat[r.category] = (byCat[r.category] ?? 0) + r.interactions));
  const best = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const bestTitle = best && CATEGORIES.find(c => c.key === best[0])?.title;

  return (
    <main dir="rtl" className="analytics-page">
      <header className="analytics-header">
        <div>
          <a className="text-link" href="/">← بازگشت به فضای کار</a>
          <h1>آمار اینستاگرام</h1>
        </div>
        <div className="analytics-actions">
          <span className="topbar-date">
            {updated ? `آخرین بروزرسانی: ${updated.toLocaleTimeString("fa-IR")}` : "آمار حساب و محتوا"}
          </span>
          <button className="secondary-button" onClick={load} disabled={loading}>
            {loading ? "در حال بروزرسانی…" : "↻ بروزرسانی"}
          </button>
        </div>
      </header>
      {error && <p role="alert" className="message-banner error">{error}</p>}

      <section className="analytics-grid" aria-label="خلاصه‌ی آمار">
        {([
          ["دنبال‌کننده", followers ?? 0],
          ["دسترسی", total("reach")],
          ["لایک", total("likes")],
          ["کامنت", total("comments")],
          ["ذخیره", total("saved")],
          ["اشتراک", total("shares")],
        ] as [string, number][]).map(([label, value]) => (
          <article className="analytics-card" key={label}>
            <span>{label}</span>
            <strong>{value.toLocaleString("fa-IR")}</strong>
          </article>
        ))}
      </section>

      {best && (
        <p className="message-banner">
          ✦ بیشترین تعامل: <b>{bestTitle ?? best[0]}</b> ({best[1].toLocaleString("fa-IR")})
        </p>
      )}

      <section className="panel chart-panel" aria-label="نمودار عملکرد محتوا">
        {rows.length === 0 ? (
          <div className="empty-state">
            هنوز محتوای منتشرشده‌ای برای نمایش آمار وجود ندارد.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e8e8df" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="reach" name="دسترسی" fill="#174d41" radius={[4, 4, 0, 0]} />
              <Bar dataKey="likes" name="لایک" fill="#d5a95d" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saved" name="ذخیره" fill="#789884" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shares" name="اشتراک" fill="#8c9cb0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h2 className="panel-title">عملکرد محتواهای اخیر</h2><div className="panel-subtitle">آمار محتواهای منتشرشده از اینستاگرام</div></div>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state">پس از انتشار محتوا، آمار آن در این بخش نمایش داده می‌شود.</div>
        ) : (
          <div className="table-wrap">
            <table className="analytics-table">
              <thead><tr><th>عنوان</th><th>قالب</th><th>دسترسی</th><th>لایک</th><th>کامنت</th><th>ذخیره</th><th>اشتراک</th></tr></thead>
              <tbody>{rows.map(row => (
                <tr key={row.id}>
                  <td>{row.title}{row.error && <span className="analytics-error"> {row.error}</span>}</td>
                  <td>{row.format}</td>
                  <td>{row.reach.toLocaleString("fa-IR")}</td>
                  <td>{row.likes.toLocaleString("fa-IR")}</td>
                  <td>{row.comments.toLocaleString("fa-IR")}</td>
                  <td>{row.saved.toLocaleString("fa-IR")}</td>
                  <td>{row.shares.toLocaleString("fa-IR")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
