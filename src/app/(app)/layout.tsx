import AppNavigation from "@/components/AppNavigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell" dir="rtl">
      <AppNavigation />
      <div className="app-content">{children}</div>
    </div>
  );
}
