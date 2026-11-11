"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, Moon, Sun, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  clearAllNotifications 
} from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { usePathname } from "next/navigation";
import { globalSearch } from "@/lib/actions/search";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

export function AppHeader() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      } catch {
        // Fallback silently if unauthenticated or error
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

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
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.cookie = "theme=light; path=/; max-age=31536000";
    } else {
      document.documentElement.classList.add("dark");
      document.cookie = "theme=dark; path=/; max-age=31536000";
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            ref={searchInputRef}
            type="search"
            placeholder="Search tasks, groceries, expenses... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-background border-border"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md p-2 z-50 max-h-80 overflow-y-auto divide-y divide-border text-xs">
            {Object.keys(searchResults).length === 0 ? (
              <p className="p-3 text-muted-foreground text-center">No results found.</p>
            ) : (
              Object.entries(searchResults).map(([category, items]: [string, any]) => (
                items.length > 0 && (
                  <div key={category} className="py-2 first:pt-0 last:pb-0">
                    <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground capitalize">{category}</p>
                    {items.map((item: any) => (
                      <Link 
                        key={item.id}
                        href={item.href || `/${category}`}
                        onClick={() => setSearchQuery("")}
                        className="block px-2 py-1.5 rounded hover:bg-muted text-foreground transition-colors"
                      >
                        {item.title || item.name || item.description}
                      </Link>
                    ))}
                  </div>
                )
              ))
            )}
          </div>
        )}
      </div>

      {/* Header Controls */}
      <div className="flex items-center gap-1.5">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="size-8 text-muted-foreground hover:text-foreground"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative size-8 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs">
              <span className="font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={async () => {
                    await markAllAsRead();
                    setUnreadCount(0);
                  }}
                  className="text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">No notifications</p>
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
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-muted/20 font-medium" : "text-muted-foreground"}`}
                  >
                    <p className="text-foreground">{n.title || n.message}</p>
                    <time className="text-[10px] text-muted-foreground mt-1 block">
                      {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                    </time>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-2 border-t border-border text-center">
                <button 
                  onClick={async () => {
                    await clearAllNotifications();
                    setNotifications([]);
                    setUnreadCount(0);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
