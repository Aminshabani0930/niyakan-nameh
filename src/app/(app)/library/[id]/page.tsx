"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { getOfflineSource, type OfflineSource } from "@/lib/offline-sources";

type SourcePage = OfflineSource & { chunks: OfflineSource["chunks"]; sourceUrl?: string; authorEditor?: string; license?: string };
type SourceListRow = { id: string; title: string };

export default function SourceReaderPage() {
    const { id } = useParams<{ id: string }>();
    const [source, setSource] = useState<SourcePage | null>(null);
    const [neighborIds, setNeighborIds] = useState<{ previous?: SourceListRow; next?: SourceListRow }>({});
    const [fontSize, setFontSize] = useState(17);
    const [dark, setDark] = useState(true);
    const [offline, setOffline] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedFont = Number(localStorage.getItem("library-font-size"));
        if (storedFont >= 14 && storedFont <= 28) setFontSize(storedFont);
        setDark(localStorage.getItem("library-dark") !== "false");
        const savedPosition = localStorage.getItem(`library-position-${id}`);
        if (savedPosition) requestAnimationFrame(() => document.getElementById(`chunk-${savedPosition}`)?.scrollIntoView());
        void (async () => {
            try {
                if (!navigator.onLine) throw new Error("offline");
                const response = await api<SourcePage>(`/api/library/${id}`);
                setSource(response);
                const list = await api<SourceListRow[]>("/api/library");
                const index = list.findIndex(item => item.id === id);
                setNeighborIds({ previous: list[index - 1], next: list[index + 1] });
            } catch {
                try {
                    const saved = await getOfflineSource(id);
                    if (!saved) throw new Error("missing");
                    setSource(saved);
                    setOffline(true);
                } catch { setError("منبع آنلاین در دسترس نیست و نسخه‌ای برای خواندن آفلاین در این دستگاه ذخیره نشده است."); }
            }
        })();
    }, [id]);

    const totalWords = useMemo(() => source?.chunks.reduce((total, chunk) => total + (chunk.text.match(/\S+/g)?.length ?? 0), 0) ?? 0, [source]);
    function setTextSize(value: number) { setFontSize(value); localStorage.setItem("library-font-size", String(value)); }
    function toggleTheme() { const value = !dark; setDark(value); localStorage.setItem("library-dark", String(value)); }

    return <main className="main-area"><header className="topbar"><div><Link className="text-link" href="/library">← کتابخانه</Link><h1 className="page-title">{source?.title ?? "خواندن منبع"}</h1><div className="topbar-date">{offline ? "نسخه‌ی آفلاین" : source?.authorEditor || ""}{source ? ` · ${source.chunks.length.toLocaleString("fa-IR")} بخش · ${totalWords.toLocaleString("fa-IR")} واژه` : ""}</div></div><div className="reader-tools"><button className="icon-button" aria-label="کوچک‌کردن قلم" onClick={() => setTextSize(Math.max(14, fontSize - 1))}>A−</button><button className="icon-button" aria-label="بزرگ‌کردن قلم" onClick={() => setTextSize(Math.min(28, fontSize + 1))}>A+</button><button className="secondary-button" onClick={toggleTheme}>{dark ? "حالت روشن" : "حالت تیره"}</button></div></header>
        {error && <p className="message-banner error" role="alert">{error}</p>}
        {source && <div className={`reader-content${dark ? " reader-dark" : " reader-light"}`} style={{ fontSize }} onScroll={event => { const element = event.currentTarget; const visible = source.chunks.find(chunk => { const node = document.getElementById(`chunk-${chunk.sequence}`); return node && node.getBoundingClientRect().bottom > 120; }); if (visible) localStorage.setItem(`library-position-${id}`, String(visible.sequence)); }}>
            {offline && <p className="message-banner">این نسخه از IndexedDB همین دستگاه خوانده می‌شود.</p>}
            {source.chunks.map(chunk => <article className="reader-chunk" id={`chunk-${chunk.sequence}`} key={chunk.id}><h2>{chunk.sequence.toLocaleString("fa-IR")} · {chunk.title || `بخش ${chunk.sequence.toLocaleString("fa-IR")}`}</h2>{chunk.chapterPage && <div className="reader-page-label">{chunk.chapterPage}</div>}<p>{chunk.text}</p></article>)}
            {source.chunks.length === 0 && <div className="empty-state">متنی برای این منبع ثبت نشده است.</div>}
        </div>}
        <nav className="reader-pagination" aria-label="جابجایی بین منابع">{neighborIds.previous ? <Link className="secondary-button" href={`/library/${neighborIds.previous.id}`}>منبع قبلی: {neighborIds.previous.title}</Link> : <span />}{neighborIds.next && <Link className="secondary-button" href={`/library/${neighborIds.next.id}`}>منبع بعدی: {neighborIds.next.title}</Link>}</nav>
    </main>;
}
