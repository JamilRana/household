"use client";

import { Plus, ShoppingCart, Store, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddGroceryListModal } from "./AddGroceryListModal";

interface GrocerySidebarProps {
  lists: any[];
  isMobile?: boolean;
}

export function GrocerySidebar({ lists, isMobile }: GrocerySidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "flex flex-col p-4 space-y-4",
      isMobile 
        ? "w-full h-full bg-background" 
        : "w-64 border-r bg-emerald-50/50 dark:bg-slate-900/50 h-[calc(100vh-64px)] shrink-0"
    )}>
      <div className="flex items-center justify-between px-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">My Lists</h2>
        <AddGroceryListModal />
      </div>

      <nav className="space-y-1">
        <Link href="/groceries">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/groceries" ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-600" : "hover:bg-emerald-100/50 dark:hover:bg-slate-800"
          )}>
            <ShoppingCart className="h-4 w-4" />
            All Items
          </div>
        </Link>

        {lists.map((list) => (
          <Link key={list.id} href={`/groceries/${list.id}`}>
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === `/groceries/${list.id}` ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-600 font-medium" : "hover:bg-emerald-100/50 dark:hover:bg-slate-800"
            )}>
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{list.name}</span>
              </div>
              {list._count?.items > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {list._count.items}
                </span>
              )}
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
