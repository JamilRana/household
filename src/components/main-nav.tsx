"use client";

import { 
  LayoutDashboard, 
  Users,
  ListTodo, 
  ShoppingCart, 
  Banknote, 
  Settings, 
  Package,
  LogOut,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupSelector } from "@/components/group-selector";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groceries", href: "/groceries", icon: ShoppingCart },
  { label: "Pantry", href: "/pantry", icon: Package },
  { label: "Finance", href: "/finance", icon: Banknote },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Admin", href: "/admin/users", icon: Shield },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card h-screen py-6 px-4 justify-between shrink-0 sticky top-0">
      <div className="space-y-6 w-full flex flex-col">
        {/* Brand */}
        <div className="space-y-4 px-2">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-base">
              L
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">LifeHub</span>
          </Link>

          <GroupSelector />
        </div>
        
        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 w-full" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-accent text-accent-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Sign out */}
      <div className="w-full pt-4 border-t border-border">
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
