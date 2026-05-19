"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, Moon, Sun, SearchIcon, X, Loader2, ChevronRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

import { GroupSelector } from "@/components/group-selector";
import { globalSearch } from "@/lib/actions/search";
import { useDebounce } from "@/hooks/use-debounce"; // I'll need to create this

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
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.isRead).length);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [pathname]);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.length >= 2) {
        setIsSearching(true);
        const results = await globalSearch(debouncedSearch);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults(null);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  return (
    <header className="h-20 border-b bg-background/50 backdrop-blur-xl sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between gap-4">
      <div className="lg:hidden">
        <GroupSelector className="h-11 w-40" />
      </div>

      <div className="flex-1 max-w-md relative group hidden md:block">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
          <Search className="size-4" />
        </div>
        <Input 
          ref={searchInputRef}
          placeholder="Global search..." 
          className="pl-10 h-12 rounded-[1.25rem] bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all w-full font-bold shadow-inner"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none opacity-40 group-focus-within:opacity-0 transition-opacity">
          <kbd className="h-5 px-1.5 rounded bg-muted border border-muted-foreground/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center">Ctrl</kbd>
          <kbd className="h-5 px-1.5 rounded bg-muted border border-muted-foreground/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center">K</kbd>
        </div>
        
        {searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-4 p-4 bg-background/80 backdrop-blur-3xl border border-muted/50 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] z-50 max-h-[500px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {isSearching ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Searching universe...</p>
              </div>
            ) : searchResults && Object.values(searchResults).some((arr: any) => arr.length > 0) ? (
              <div className="space-y-6">
                {Object.entries(searchResults).map(([key, items]: [string, any]) => (
                  items.length > 0 && (
                    <div key={key} className="space-y-2">
                      <h4 className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                        {key}
                        <span className="h-px flex-1 ml-4 bg-muted/50" />
                      </h4>
                      <div className="grid gap-1">
                        {items.map((item: any) => (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              setSearchQuery("");
                            }}
                            className="p-4 rounded-[1.25rem] hover:bg-primary/5 cursor-pointer transition-all flex flex-col group/item border border-transparent hover:border-primary/10"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm tracking-tight group-hover/item:text-primary transition-colors">{item.title || item.name || item.description}</span>
                              <ChevronRight className="size-4 opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all text-primary" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {item.list && <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{item.list.name}</span>}
                              {item.category && <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">#{item.category.name}</span>}
                              {item.location && <span className="text-[10px] text-amber-600/60 font-black uppercase tracking-widest">@{item.location}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <Search className="size-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-lg">No matches found</p>
                  <p className="text-sm text-muted-foreground font-bold">Try adjusting your search terms</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-2xl size-11 bg-muted/50 hover:bg-muted transition-colors">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 size-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 p-4 rounded-[2.5rem] shadow-2xl border-muted/50 bg-background/80 backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-muted/50 mb-4">
              <h3 className="font-black tracking-tight text-xl">Notifications</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-xl">Read All</Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-xl text-rose-500 hover:text-rose-600">Clear</Button>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={cn(
                      "p-4 rounded-[1.5rem] cursor-pointer flex flex-col gap-1 items-start transition-all duration-300",
                      !n.isRead ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/50"
                    )}
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    <div className="flex justify-between w-full items-start gap-4">
                      <span className="font-black text-sm tracking-tight">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest whitespace-nowrap">{formatDistanceToNow(new Date(n.createdAt))} ago</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Bell className="size-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-sm font-bold italic tracking-tight">No notifications yet</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-2xl size-11 bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => {
             const html = document.documentElement;
             if (html.classList.contains('dark')) {
               html.classList.remove('dark');
               document.cookie = "theme=light; path=/";
             } else {
               html.classList.add('dark');
               document.cookie = "theme=dark; path=/";
             }
          }}
        >
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
