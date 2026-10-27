"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Entry = { id: string; name: string; period: string; cityProvince: string; style: string; features: string[]; status: string; sources: { source: { id: string; title: string } }[] };

export default function ArchitectureDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [entry, setEntry] = useState<Entry | null>(null);
    const [error, setError] = useState("");
    useEffect(() => { void api<Entry>(`/api/architecture/${id}`).then(setEntry).catch(() => setError("این مدخل پیدا نشد یا هنوز تأیید نشده است.")); }, [id]);
    return <main className="main-area"><Link className="text-link" href="/library/architecture">← معماری ایران</Link>{error && <p role="alert" className="message-banner error">{error}</p>}{entry && <article className="panel architecture-detail"><div className="eyebrow">{entry.period} · {entry.cityProvince}</div><h1 className="page-title">{entry.name}</h1><p>{entry.style}</p><ul>{entry.features.map((feature, index) => <li key={index}>{feature}</li>)}</ul><h2 className="panel-title">منابع</h2><ul>{entry.sources.map(item => <li key={item.source.id}><Link className="text-link" href={`/library/${item.source.id}`}>{item.source.title}</Link></li>)}</ul></article>}</main>;
}
