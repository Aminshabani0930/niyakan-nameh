export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <main className="main-area">
      <header className="topbar">
        <div>
          <div className="eyebrow">فضای مدیریت محتوا</div>
          <h1 className="page-title">{title}</h1>
        </div>
      </header>
      <section className="panel">
        <div className="empty-state">این بخش به‌زودی در دسترس خواهد بود.</div>
      </section>
    </main>
  );
}
