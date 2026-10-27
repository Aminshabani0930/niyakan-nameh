"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const result = await signIn("credentials", { password, redirect: false });
      if (result?.ok) window.location.href = "/";
      else setErr("رمز واردشده صحیح نیست.");
    } catch {
      setErr("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="login-shell">
      <section className="login-art">
        <a href="/" className="brand">
          <span className="brand-symbol">ن</span>
          <span><span className="brand-name">نیاکان‌نامه</span><span className="brand-caption">روایت زنده‌ی ریشه‌ها</span></span>
        </a>
        <div className="login-copy">
          <div className="hero-kicker">از ریشه تا روایت</div>
          <h1>قصه‌های ایران را زنده نگه داریم</h1>
          <p>به فضای مدیریت محتوای نیاکان‌نامه وارد شوید و روایت‌های تاریخی و فرهنگی را برنامه‌ریزی کنید.</p>
        </div>
        <div className="login-quote">«توانا بود هر که دانا بود»</div>
      </section>
      <section className="login-form-side">
        <form onSubmit={submit} className="login-form">
          <div className="brand-symbol" aria-hidden="true">ن</div>
          <h2>خوش آمدید</h2>
          <p>برای ورود به فضای کار، رمز عبور خود را وارد کنید.</p>
          <label htmlFor="password" className="login-label">رمز عبور</label>
          <input id="password" type="password" value={password}
            onChange={event => setPassword(event.target.value)} placeholder="رمز عبور"
            className="login-input" autoComplete="current-password" autoFocus required />
          {err && <p role="alert" className="login-error">{err}</p>}
          <button className="primary-button login-submit" type="submit" disabled={busy}>
            {busy ? "در حال ورود…" : "ورود به فضای کار"}
          </button>
        </form>
      </section>
    </main>
  );
}
