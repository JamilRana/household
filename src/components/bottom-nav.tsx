"use client";

import { 
  LayoutDashboard, 
  ListTodo, 
  ShoppingCart, 
  Banknote, 
  MoreHorizontal 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const items = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groceries", href: "/groceries", icon: ShoppingCart },
  { label: "Finance", href: "/finance", icon: Banknote },
  { label: "More", href: "/more", icon: MoreHorizontal }, // Or a drawer trigger
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-2xl border-t z-50 flex items-center justify-around px-4 lg:hidden pb-safe">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="relative flex flex-col items-center gap-1 py-2 px-4 group"
          >
            {isActive && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute inset-0 bg-primary/10 rounded-2xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            
            <item.icon className={cn(
              "size-6 transition-all duration-300 relative z-10",
              isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:scale-110"
            )} />
            
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest relative z-10",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
