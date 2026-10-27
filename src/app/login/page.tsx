"use client";
import Image from "next/image";
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
      <Image
        className="login-background"
        src="/brand/relief-hero-1800.webp"
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <div className="login-overlay" aria-hidden="true" />
      <section className="login-form-side">
        <form onSubmit={submit} className="login-form">
          <Image className="login-logo" src="/icons/pwa-512.png" alt="نیاکان‌نامه" width={300} height={300} priority />
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
