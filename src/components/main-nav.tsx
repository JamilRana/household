"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupSelector } from "@/components/group-selector";
import { signOut } from "next-auth/react";
import { allNavItems, isActivePath } from "@/components/nav-items";

export function MainNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = allNavItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-60 border-r border-border bg-card h-screen py-5 px-3.5 justify-between shrink-0 sticky top-0 z-30 select-none">
      <div className="space-y-5 w-full flex flex-col">
        {/* Brand & Group Selector */}
        <div className="space-y-3 px-1">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="size-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm tracking-tight shadow-2xs group-hover:opacity-95 transition-opacity">
              L
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              LifeHub
            </span>
          </Link>

          <GroupSelector />
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-0.5 w-full" aria-label="Main navigation">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer / Sign Out */}
      <div className="w-full pt-3 border-t border-border/80">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
