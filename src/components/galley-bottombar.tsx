"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ListTodo,
  ShoppingCart,
  Banknote,
  MoreHorizontal,
  Package,
  Users,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { GroupSelector } from "@/components/group-selector";
import { getNavCounts } from "@/lib/actions/nav";

interface GalleyBottombarProps {
  isAdmin?: boolean;
}

export function GalleyBottombar({ isAdmin = false }: GalleyBottombarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [counts, setCounts] = useState<{ tasks: number; groceries: number }>({ tasks: 0, groceries: 0 });

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    getNavCounts().then(setCounts).catch(() => {});
  }, [pathname]);

  const primaryTabs = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tasks", href: "/tasks", icon: ListTodo, count: counts.tasks },
    { label: "Groceries", href: "/groceries", icon: ShoppingCart, count: counts.groceries },
    { label: "Finance", href: "/finance", icon: Banknote },
  ];

  const moreTabs = [
    { label: "Groups", href: "/teams", icon: Users },
    { label: "Settings", href: "/settings", icon: Settings },
    ...(isAdmin ? [{ label: "Admin Console", href: "/admin/users", icon: Shield }] : []),
  ];

  const isMoreActive = moreTabs.some(
    (t) => pathname === t.href || pathname.startsWith(t.href)
  );

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-3 right-3 z-40 md:hidden glass rounded-[26px] p-1.5 grid grid-cols-5 gap-1 shadow-2xl select-none"
      >
        {primaryTabs.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-1 rounded-[20px] text-[11px] font-semibold transition-all",
                active
                  ? "bg-foreground/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <item.icon className="size-4.5 mb-1 shrink-0" />
              <span className="truncate max-w-full text-[10px]">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#ea580c] ring-2 ring-background" />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More options"
          className={cn(
            "relative flex flex-col items-center justify-center py-2 px-1 rounded-[20px] text-[11px] font-semibold transition-all cursor-pointer",
            isMoreActive
              ? "bg-foreground/10 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <MoreHorizontal className="size-4.5 mb-1 shrink-0" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More Drawer */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] p-5 pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 border-t border-rule bg-card/95 backdrop-blur-2xl"
        >
          <SheetTitle className="text-base font-bold text-foreground">Menu & Household</SheetTitle>
          <div className="pt-1">
            <GroupSelector className="w-full" />
          </div>
          <div className="grid gap-1 pt-2">
            {moreTabs.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground/10 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-5 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
