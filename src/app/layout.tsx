import type { Viewport } from "next";
import "./globals.css";
import PwaSupport from "@/components/PwaSupport";

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "نیاکان‌نامه | مدیریت روایت‌ها",
  description: "فضای برنامه‌ریزی و مدیریت محتوای تاریخی و فرهنگی نیاکان‌نامه",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "نیاکان‌نامه",
    statusBarStyle: "default" as const,
  },
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "نیاکان‌نامه",
    description: "فضای برنامه‌ریزی و مدیریت محتوای تاریخی و فرهنگی نیاکان‌نامه",
    images: [{ url: "/brand/relief-hero-1800.webp", width: 1800, height: 1013, alt: "نقش‌برجسته‌ی هخامنشی" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14100c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <PwaSupport />
      </body>
    </html>
  );
}
