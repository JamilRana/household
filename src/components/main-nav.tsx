"use client";

import { 
  LayoutDashboard, 
  Users,
  ListTodo, 
  ShoppingCart, 
  Banknote, 
  Settings, 
  UserCircle, 
  Package,
  LogOut,
  ChevronRight,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { GroupSelector } from "@/components/group-selector";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Grocery", href: "/groceries", icon: ShoppingCart },
  { label: "Pantry", href: "/pantry", icon: Package },
  { label: "Finance", href: "/finance", icon: Banknote },
  { label: "Admin", href: "/admin/users", icon: Shield },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-background/50 backdrop-blur-xl h-screen py-8 px-6 justify-between shrink-0 sticky top-0 transition-all duration-300">
      <div className="space-y-10 w-full flex flex-col">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3 px-2 group">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-xl shadow-primary/20 group-hover:rotate-6 transition-transform">
              L
            </div>
            <span className="text-2xl font-bold tracking-tight">LifeHub</span>
          </Link>

          <GroupSelector />
        </div>
        
        <nav className="flex flex-col gap-3 w-full">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="group relative">
              <div className={cn(
                "flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden",
                pathname.startsWith(item.href) 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <item.icon className={cn(
                  "h-6 w-6 shrink-0 transition-transform duration-300",
                  pathname.startsWith(item.href) ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className="font-bold tracking-tight text-sm">{item.label}</span>
                
                {pathname.startsWith(item.href) && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute right-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                )}
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div className="w-full pt-8 border-t border-muted/50">
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer group"
        >
          <LogOut className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
