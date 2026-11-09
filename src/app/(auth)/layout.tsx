import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-sm">
              <LayoutDashboard className="size-5" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">LifeHub</span>
          </div>
          <p className="text-sm text-muted-foreground">Household coordination and management</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          {children}
        </div>

        <footer className="text-center text-xs text-muted-foreground">
          LifeHub Platform · Private Household Workspace
        </footer>
      </div>
    </div>
  );
}
