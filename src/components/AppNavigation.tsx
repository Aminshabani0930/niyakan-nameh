"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

const navigation = [
  { href: "/", label: "داشبورد", icon: "⌂" },
  { href: "/plan", label: "برنامه", icon: "▦" },
  { href: "/content", label: "محتوا", icon: "▤" },
  { href: "/calendar", label: "تقویم", icon: "▦" },
  { href: "/agent", label: "ایجنت", icon: "✦", mobileExtra: true },
  { href: "/analytics", label: "آمار", icon: "⌁", mobileExtra: true },
  { href: "/library", label: "کتابخانه", icon: "▤", mobileExtra: true },
  { href: "/cyrus", label: "کوروش", icon: "◈", mobileExtra: true },
  { href: "/research", label: "پژوهش", icon: "⌕", mobileExtra: true },
  { href: "/settings", label: "تنظیمات", icon: "⚙", mobileExtra: true },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <Image className="brand-logo" src="/icons/pwa-192.png" alt="" width={40} height={40} />
        <span>
          <span className="brand-name">نیاکان‌نامه</span>
          <span className="brand-caption">روایت زنده‌ی ریشه‌ها</span>
        </span>
      </Link>
      <div className="nav-caption">فضای کار</div>
      <nav className="nav-list" aria-label="ناوبری اصلی">
        {navigation.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              className={`nav-link${active ? " active" : ""}${item.mobileExtra ? " mobile-extra" : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button className="nav-more-button" type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(value => !value)}>⋯ <span>بیشتر</span></button>
      {moreOpen && <nav className="nav-more-menu" aria-label="صفحه‌های بیشتر">{navigation.filter(item => item.mobileExtra).map(item => <Link className={`nav-more-link${pathname.startsWith(item.href) ? " active" : ""}`} href={item.href} key={item.href} onClick={() => setMoreOpen(false)}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav>}
      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <strong>یک روایت در هر روز</strong>
        از تاریخ و اسطوره تا دستاوردهایی که هنوز الهام‌بخش‌اند.
      </div>
      <div className="sidebar-bottom">
        <div className="profile"><span className="profile-avatar">✦</span><span>مدیر نیاکان‌نامه</span></div>
        <button className="signout-button" onClick={() => signOut({ callbackUrl: "/login" })}>خروج</button>
      </div>
    </aside>
  );
}
