"use client";

import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination";
import { Search, ShoppingBasket, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GroceryItemCard } from "./grocery-item";
import { cn } from "@/lib/utils";
import { format, isBefore, isAfter } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GroceryListWithFiltersProps {
  initialItems: any[];
}

const getPurchaseMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  options.push({ label: "All Purchases", value: "ALL" });
  options.push({ label: "This Month", value: "THIS_MONTH" });
  options.push({ label: "Last Month", value: "LAST_MONTH" });

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const label = `Purchased in ${format(d, "MMMM yyyy")}`;
    const value = format(d, "yyyy-MM");
    
    if (i > 1) {
      options.push({ label, value });
    }
  }
  return options;
};

export function GroceryListWithFilters({ initialItems }: GroceryListWithFiltersProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "PURCHASED">("PENDING");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, monthFilter, selectedCategory, items]);

  const monthOptions = getPurchaseMonthOptions();
  const selectedMonthLabel = monthOptions.find(opt => opt.value === monthFilter)?.label || "All Purchases";

  // Sync state if items change or toggled
  const handleToggleState = (id: string, newStatus: string, actualPrice?: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: newStatus,
          actualPrice: actualPrice !== undefined ? actualPrice : item.actualPrice,
          purchasedAt: newStatus === "PURCHASED" ? new Date() : null,
        };
      }
      return item;
    }));
  };

  // Remove deleted items
  const handleDeleteState = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Categories list based on items
  const categoriesList = Array.from(new Set(items.map((i: any) => i.category || "Uncategorized"))) as string[];

  const filteredItems = items.filter(item => {
    // Status match
    if (item.status !== statusFilter) return false;

    // Search match
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Category match
    if (selectedCategory && item.category !== selectedCategory) return false;

    // Date/Month match (only for PURCHASED items since pending items are active)
    if (statusFilter === "PURCHASED" && monthFilter !== "ALL") {
      const purchaseDate = item.purchasedAt ? new Date(item.purchasedAt) : new Date(item.createdAt);
      const today = new Date();
      
      if (monthFilter === "THIS_MONTH") {
        return purchaseDate.getFullYear() === today.getFullYear() && purchaseDate.getMonth() === today.getMonth();
      }
      if (monthFilter === "LAST_MONTH") {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return purchaseDate.getFullYear() === lastMonth.getFullYear() && purchaseDate.getMonth() === lastMonth.getMonth();
      }
      
      const [year, month] = monthFilter.split("-").map(Number);
      return purchaseDate.getFullYear() === year && (purchaseDate.getMonth() + 1) === month;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <div 
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer border",
            !selectedCategory 
              ? "bg-emerald-600 border-emerald-600 text-white" 
              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-emerald-500"
          )}
        >
          All Categories
        </div>
        {categoriesList.map((cat: string) => (
          <div 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer border",
              selectedCategory === cat 
                ? "bg-emerald-600 border-emerald-600 text-white" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-emerald-500"
            )}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Main List Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit self-start shadow-inner border border-slate-200/20">
            <Button
              variant="ghost"
              onClick={() => setStatusFilter("PENDING")}
              className={cn(
                "rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10 transition-all",
                statusFilter === "PENDING"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Shopping List
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStatusFilter("PURCHASED")}
              className={cn(
                "rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10 transition-all",
                statusFilter === "PURCHASED"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              Purchase History
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Quick Search */}
            <div className="relative flex-1 md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Quick search..." 
                className="pl-9 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-sm focus-visible:ring-emerald-500 font-bold text-xs" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Expiry / Purchase Month Filter */}
            {statusFilter === "PURCHASED" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 px-5 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[10px] gap-2 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Calendar className="h-4 w-4" />
                    {selectedMonthLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 max-h-[300px] overflow-y-auto min-w-[200px]">
                  {monthOptions.map(opt => (
                    <DropdownMenuItem key={opt.value} onClick={() => setMonthFilter(opt.value)} className="rounded-xl font-bold">
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* List of items */}
        {paginatedItems.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 animate-in fade-in duration-300">
              {paginatedItems.map((item: any) => (
                <GroceryItemCard 
                  key={item.id} 
                  item={item} 
                />
              ))}
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/10 p-6 rounded-3xl mt-4">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBasket className="h-10 w-10 text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-900 dark:text-slate-100 text-xl font-black">
                {statusFilter === "PENDING" ? "Shopping list empty" : "No purchase history"}
              </p>
              <p className="text-sm text-slate-400 font-bold">
                {statusFilter === "PENDING" ? "Add items to your lists to see them here." : "Items you purchase will appear here."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
