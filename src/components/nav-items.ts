import {
  CalendarCheck,
  ListTodo,
  ShoppingCart,
  Banknote,
  Package,
  Users,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

/** Everything, in the order shown in the desktop sidebar. */
export const allNavItems: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: CalendarCheck },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groceries", href: "/groceries", icon: ShoppingCart },
  { label: "Pantry", href: "/pantry", icon: Package },
  { label: "Money", href: "/finance", icon: Banknote },
  { label: "Groups", href: "/teams", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin", href: "/admin/users", icon: Shield, adminOnly: true },
];

/** The four places you open every day. The rest live under "More" on phones. */
export const primaryMobileHrefs = ["/dashboard", "/tasks", "/groceries", "/pantry"];

export function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
