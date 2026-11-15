"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { GroupSelector } from "@/components/group-selector";
import { allNavItems, isActivePath, primaryMobileHrefs } from "@/components/nav-items";

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the menu after navigating
  useEffect(() => setMoreOpen(false), [pathname]);

  const primary = allNavItems.filter((i) => primaryMobileHrefs.includes(i.href));
  const more = allNavItems.filter((i) => !primaryMobileHrefs.includes(i.href) && (!i.adminOnly || isAdmin));
  const moreActive = more.some((i) => isActivePath(pathname, i.href));

  const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-12 text-xs font-medium transition-colors";

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex items-stretch px-1 pb-[env(safe-area-inset-bottom)] h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        {primary.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tab, active ? "text-primary" : "text-muted-foreground")}
            >
              <item.icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          aria-haspopup="dialog"
          className={cn(tab, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <MoreHorizontal className="size-5 shrink-0" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 pt-12 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
          <SheetTitle className="sr-only">More</SheetTitle>
          <GroupSelector className="w-full" />
          <div className="grid gap-1">
            {more.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium",
                  isActivePath(pathname, item.href) ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                )}
              >
                <item.icon className="size-5 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-5" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
