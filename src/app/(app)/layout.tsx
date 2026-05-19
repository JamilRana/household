import { MainNav } from "@/components/main-nav";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50/30 dark:bg-slate-950">
      <MainNav />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
