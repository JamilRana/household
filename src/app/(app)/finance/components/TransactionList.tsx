"use client";

import { useState, useEffect, useTransition } from "react";
import { Banknote, Trash2, Search, Filter, Loader2, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { deleteTransaction, getTransactions } from "@/lib/actions/finance";
import { TransactionType } from "@prisma/client";
import { Pagination } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionListProps {
  initialTransactions: any[];
  categories: any[];
}

const getMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  options.push({ label: "All Time", value: "ALL" });
  options.push({ label: "This Month", value: "THIS_MONTH" });
  options.push({ label: "Last Month", value: "LAST_MONTH" });
  options.push({ label: "Custom Range...", value: "CUSTOM" });

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const label = format(d, "MMMM yyyy");
    const value = format(d, "yyyy-MM");
    
    // Prevent duplicate entries for "This Month" / "Last Month" labels to keep it clean
    if (i > 1) {
      options.push({ label, value });
    }
  }
  return options;
};

const getDateRange = (value: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  if (value === "ALL") {
    return { startDate: undefined, endDate: undefined };
  }
  if (value === "THIS_MONTH") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }
  if (value === "LAST_MONTH") {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }
  if (value === "CUSTOM") {
    const startDate = customStart ? new Date(customStart) : undefined;
    // Set to end of the selected day
    const endDate = customEnd ? new Date(customEnd + "T23:59:59.999") : undefined;
    return { startDate, endDate };
  }
  
  const [year, month] = value.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

export function TransactionList({ initialTransactions, categories }: TransactionListProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [cursor, setCursor] = useState(initialTransactions.length > 0 ? initialTransactions[initialTransactions.length - 1].id : null);
  const [hasMore, setHasMore] = useState(initialTransactions.length === 50);
  const [isPending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [transactions]);

  // Filter state
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "ALL">("ALL");
  const [categoryId, setCategoryId] = useState<string | "ALL">("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const monthOptions = getMonthOptions();
  let selectedMonthLabel = "All Time";
  if (monthFilter === "CUSTOM") {
    if (customStartDate && customEndDate) {
      try {
        selectedMonthLabel = `${format(new Date(customStartDate), "MMM d")} - ${format(new Date(customEndDate), "MMM d")}`;
      } catch (e) {
        selectedMonthLabel = "Custom Range";
      }
    } else {
      selectedMonthLabel = "Custom Range";
    }
  } else {
    selectedMonthLabel = monthOptions.find(opt => opt.value === monthFilter)?.label || "All Time";
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleFilterChange();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, type, categoryId, monthFilter, customStartDate, customEndDate]);

  const handleFilterChange = async () => {
    setLoadingMore(true);
    const { startDate, endDate } = getDateRange(monthFilter, customStartDate, customEndDate);
    const results = await getTransactions({
      take: 50,
      type: type === "ALL" ? undefined : type,
      categoryId: categoryId === "ALL" ? undefined : categoryId,
      search: search || undefined,
      startDate,
      endDate,
    });
    setTransactions(results);
    setCursor(results.length > 0 ? results[results.length - 1].id : null);
    setHasMore(results.length === 50);
    setLoadingMore(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { startDate, endDate } = getDateRange(monthFilter, customStartDate, customEndDate);
    const results = await getTransactions({
      cursor,
      take: 50,
      type: type === "ALL" ? undefined : type,
      categoryId: categoryId === "ALL" ? undefined : categoryId,
      search: search || undefined,
      startDate,
      endDate,
    });
    
    if (results.length > 0) {
      setTransactions(prev => [...prev, ...results]);
      setCursor(results[results.length - 1].id);
      setHasMore(results.length === 50);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 px-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search ledger..." 
            className="pl-12 h-12 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-bold text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          {monthFilter === "CUSTOM" && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-3 sm:px-4 h-12 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400">From</span>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent border-none font-bold text-xs outline-none text-slate-700 dark:text-slate-200 focus:ring-0 w-24 sm:w-28 [color-scheme:light_dark]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400">To</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent border-none font-bold text-xs outline-none text-slate-700 dark:text-slate-200 focus:ring-0 w-24 sm:w-28 [color-scheme:light_dark]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-2 sm:px-6 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[9px] sm:text-[10px] gap-1 sm:gap-2 justify-center">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="truncate">{selectedMonthLabel}</span>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-2 sm:px-6 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[9px] sm:text-[10px] gap-1 sm:gap-2 justify-center">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="truncate">{type === "ALL" ? "All Types" : type}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl p-2 min-w-[150px]">
                <DropdownMenuItem onClick={() => setType("ALL")} className="rounded-xl font-bold">All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setType("INCOME")} className="rounded-xl font-bold text-emerald-600">Income</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setType("EXPENSE")} className="rounded-xl font-bold text-rose-600">Expense</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-2 sm:px-6 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[9px] sm:text-[10px] gap-1 sm:gap-2 justify-center">
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="truncate">{categoryId === "ALL" ? "All Cats" : categories.find(c => c.id === categoryId)?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl p-2 max-h-[300px] overflow-y-auto min-w-[200px]">
                <DropdownMenuItem onClick={() => setCategoryId("ALL")} className="rounded-xl font-bold">All Categories</DropdownMenuItem>
                {categories.map(cat => (
                  <DropdownMenuItem key={cat.id} onClick={() => setCategoryId(cat.id)} className="rounded-xl font-bold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] animate-in fade-in duration-300">
        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {paginatedTransactions.map((t) => (
            <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-7 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div 
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] shrink-0 flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3" 
                  style={{ backgroundColor: t.category.color }}
                >
                  <Banknote className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-xl leading-none truncate">{t.description || t.category.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5 sm:mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{t.category.name}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold">{format(new Date(t.date), "EEE, MMM d")}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 border-t sm:border-none border-slate-50 dark:border-slate-800/50 pt-3 sm:pt-0">
                <span className="sm:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</span>
                <div className="flex items-center gap-3 sm:gap-8">
                  <div className={cn(
                    "text-lg sm:text-2xl font-black tracking-tighter",
                    t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === "INCOME" ? "+" : "-"}${Number(t.amount).toLocaleString()}
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all rounded-2xl h-10 w-10 shrink-0"
                  >
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {transactions.length === 0 && !loadingMore && (
            <div className="p-16 sm:p-24 text-center">
              <Banknote className="h-12 w-12 sm:h-16 sm:w-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 text-base sm:text-lg font-black italic">No records found matching filters.</p>
            </div>
          )}

          {hasMore && (
            <div className="p-6 sm:p-8 text-center border-b border-slate-50 dark:border-slate-800/50">
              <Button 
                variant="ghost" 
                onClick={loadMore} 
                disabled={loadingMore}
                className="font-black uppercase tracking-widest text-[9px] sm:text-[10px] text-blue-600 hover:bg-blue-50 rounded-2xl px-6 sm:px-8 h-12 w-full sm:w-auto"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load More History From Server
              </Button>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="p-6 sm:p-8 bg-slate-50/30 dark:bg-slate-900/10">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
