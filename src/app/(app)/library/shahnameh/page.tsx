"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Story = { id: string; title: string; order: number; verses: { id: string; order: number; firstHemistich: string; secondHemistich: string }[] };

export default function ShahnamehPage() {
    const [stories, setStories] = useState<Story[]>([]);
    const [storyId, setStoryId] = useState("");
    const [error, setError] = useState("");
    useEffect(() => { void api<{ stories: Story[] }>(`/api/library/shahnameh${storyId ? `?story=${storyId}` : ""}`).then(result => setStories(result.stories)).catch(() => setError("دریافت شاهنامه ناموفق بود.")); }, [storyId]);
    const story = stories[0];
    return <main className="main-area"><header className="topbar"><div><Link href="/library" className="text-link">← کتابخانه</Link><h1 className="page-title">شاهنامه</h1><div className="topbar-date">متن از فایل واردشده‌ی کاربر؛ بدون تولید از حافظه‌ی مدل</div></div>{stories.length > 0 && <select className="field-input" value={storyId} onChange={event => setStoryId(event.target.value)}><option value="">همه‌ی داستان‌ها</option>{stories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</header>{error && <p className="message-banner error">{error}</p>}{stories.length === 0 ? <section className="panel empty-state">هنوز بارگذاری نشده. از بخش کتابخانه فایل JSON یا CSV گنجور را وارد کنید.</section> : <div className="shahnameh-stories">{(story ? [story] : stories).map(item => <section className="panel" key={item.id}><h2 className="panel-title">{item.title}</h2><div className="verse-list">{item.verses.map(verse => <article className="verse-row" key={verse.id}><span>{verse.order.toLocaleString("fa-IR")}</span><div className="verse-columns"><p>{verse.firstHemistich}</p><p>{verse.secondHemistich}</p></div></article>)}</div></section>)}</div>}</main>;
}
