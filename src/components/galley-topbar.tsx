"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ListTodo,
  ShoppingCart,
  TrendingDown,
  Package,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Loader2,
  Check,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GroupSelector } from "@/components/group-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearch } from "@/lib/actions/search";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "@/lib/actions/notifications";
import { getNavCounts } from "@/lib/actions/nav";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDistanceToNow } from "date-fns";

interface GalleyTopbarProps {
  isAdmin?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export function GalleyTopbar({ isAdmin = false, user }: GalleyTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<{ tasks: number; groceries: number }>({ tasks: 0, groceries: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const isInput =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "task" } }));
        } else if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "grocery" } }));
        } else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "expense" } }));
        } else if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "pantry" } }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch counts and notifications
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, notes] = await Promise.all([getNavCounts(), getNotifications()]);
        setCounts(c);
        setNotifications(notes);
        setUnreadCount(notes.filter((n: any) => !n.isRead).length);
      } catch {
        // Fallback silently if unauthenticated
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Global search trigger
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults(null);
      return;
    }

    const runSearch = async () => {
      setIsSearching(true);
      try {
        const results = await globalSearch(debouncedSearch);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    runSearch();
  }, [debouncedSearch]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
      document.cookie = "theme=light; path=/; max-age=31536000";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.dataset.theme = "dark";
      document.cookie = "theme=dark; path=/; max-age=31536000";
    }
  };

  const navLinks = [
    { label: "Overview", href: "/dashboard" },
    { label: "Tasks", href: "/tasks", count: counts.tasks },
    { label: "Groceries", href: "/groceries", count: counts.groceries },
    { label: "Pantry", href: "/pantry" },
    { label: "Finance", href: "/finance" },
    { label: "Groups", href: "/teams" },
    { label: "Settings", href: "/settings" },
    ...(isAdmin ? [{ label: "Admin", href: "/admin/users" }] : []),
  ];

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LH";

  return (
    <>
      <header className="topbar-galley glass select-none">
        {/* Brand & Household Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded-[10px] bg-gradient-to-br from-[#ffc061] via-[#ff7a2f] to-[#e2441b] p-1.5 shadow-[inset_0_1px_rgba(255,255,255,0.55),0_6px_16px_-6px_rgba(239,90,28,0.7)] flex items-center justify-center text-[#2a1205] transition-transform group-hover:scale-105">
              <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 6.5V5M8.5 19h7" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-foreground hidden sm:inline-block">
              LifeHub
            </span>
          </Link>

          <div className="hidden lg:block border-l border-rule pl-2.5">
            <GroupSelector />
          </div>
        </div>

        {/* Center Pill Tabs (Desktop & Tablet) */}
        <nav className="tabs-galley hidden md:flex" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative",
                  active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="count">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Command K)"
            className="flex items-center gap-2 h-9 px-3 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground shadow-[inset_0_0_0_1px_var(--rule)] transition-all cursor-pointer text-xs"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline-block">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/10 border border-rule text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* "+ New" Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="btn-heat px-3 sm:px-4 text-xs font-semibold"
                aria-label="New Item"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl border border-rule bg-popover shadow-lg text-xs">
              <DropdownMenuItem
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "task" } }))
                }
                className="gap-2.5 py-2 cursor-pointer rounded-lg"
              >
                <ListTodo className="size-4 text-primary" />
                <span className="flex-1 font-medium">Task</span>
                <kbd className="text-[10px] font-mono text-muted-foreground">N</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "grocery" } }))
                }
                className="gap-2.5 py-2 cursor-pointer rounded-lg"
              >
                <ShoppingCart className="size-4 text-primary" />
                <span className="flex-1 font-medium">Grocery item</span>
                <kbd className="text-[10px] font-mono text-muted-foreground">G</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "expense" } }))
                }
                className="gap-2.5 py-2 cursor-pointer rounded-lg"
              >
                <TrendingDown className="size-4 text-primary" />
                <span className="flex-1 font-medium">Expense</span>
                <kbd className="text-[10px] font-mono text-muted-foreground">E</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "pantry" } }))
                }
                className="gap-2.5 py-2 cursor-pointer rounded-lg"
              >
                <Package className="size-4 text-primary" />
                <span className="flex-1 font-medium">Pantry item</span>
                <kbd className="text-[10px] font-mono text-muted-foreground">P</kbd>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Notifications"
                className="relative size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#ea580c] ring-2 ring-background" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border border-rule bg-popover shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-rule text-xs bg-muted/40">
                <span className="font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      await markAllAsRead();
                      setUnreadCount(0);
                    }}
                    className="text-primary font-medium hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-rule text-xs">
                {notifications.length === 0 ? (
                  <p className="p-5 text-center text-muted-foreground">No notifications</p>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.isRead) {
                          await markAsRead(n.id);
                          setUnreadCount((c) => Math.max(0, c - 1));
                        }
                      }}
                      className={cn(
                        "p-3.5 cursor-pointer hover:bg-muted/50 transition-colors",
                        !n.isRead ? "bg-primary/5 font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <p className="leading-snug">{n.title || n.message}</p>
                      <time className="text-[11px] text-muted-foreground/80 mt-1 block font-mono">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                      </time>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t border-rule text-center bg-muted/30">
                  <button
                    onClick={async () => {
                      await clearAllNotifications();
                      setNotifications([]);
                      setUnreadCount(0);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    Clear all notifications
                  </button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar & Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User profile"
                className="size-9 rounded-full bg-gradient-to-br from-[#dde5ee] to-[#8ea2b7] text-[#17222e] font-bold text-xs flex items-center justify-center shadow-[inset_0_1px_rgba(255,255,255,0.7),0_0_0_2px_var(--rim-top)] hover:scale-105 transition-transform cursor-pointer"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border border-rule bg-popover shadow-xl text-xs">
              <DropdownMenuLabel className="px-2 py-1.5 font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="font-semibold text-foreground text-sm">{user?.name || "LifeHub User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-rule" />
              <div className="px-2 py-1.5 lg:hidden">
                <GroupSelector />
              </div>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="gap-2.5 py-2 cursor-pointer rounded-lg"
              >
                <SettingsIcon className="size-4 text-muted-foreground" />
                <span>Settings & Preferences</span>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => router.push("/admin/users")}
                  className="gap-2.5 py-2 cursor-pointer rounded-lg"
                >
                  <Shield className="size-4 text-muted-foreground" />
                  <span>Admin Console</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-rule" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="gap-2.5 py-2 cursor-pointer rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Dialog (Galley palette) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-xl p-0 rounded-2xl overflow-hidden border border-rule bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="p-3.5 border-b border-rule flex flex-row items-center gap-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search tasks, groceries, expenses, pantry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-sm h-9 bg-transparent"
              autoFocus
            />
            {isSearching && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto p-2 text-xs divide-y divide-rule">
            {!searchQuery.trim() ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Type to search across everything in your household.</p>
                <div className="flex items-center justify-center gap-2 mt-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-secondary border border-rule">Tasks</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary border border-rule">Groceries</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary border border-rule">Expenses</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary border border-rule">Pantry</span>
                </div>
              </div>
            ) : searchResults && Object.values(searchResults).every((arr: any) => !arr || arr.length === 0) ? (
              <p className="py-8 text-center text-muted-foreground">No matches found for &quot;{searchQuery}&quot;.</p>
            ) : (
              searchResults &&
              Object.entries(searchResults).map(([category, items]: [string, any]) =>
                items && items.length > 0 ? (
                  <div key={category} className="py-2 first:pt-0 last:pb-0">
                    <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground capitalize tracking-wide">
                      {category}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item: any) => (
                        <Link
                          key={item.id}
                          href={item.href || `/${category}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted text-foreground transition-colors group"
                        >
                          <span className="font-medium truncate">{item.title || item.name || item.description}</span>
                          <span className="text-[11px] text-muted-foreground group-hover:text-foreground">
                            Open →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
