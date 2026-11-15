"use client";

import { formatMoney } from "@/lib/format";
import { useState, useEffect, useTransition } from "react";
import { Banknote, Trash2, Search, Filter, Loader2, ChevronDown, Calendar, X, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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

  for (let i = 2; i < 8; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const label = format(d, "MMMM yyyy");
    const value = format(d, "yyyy-MM");
    options.push({ label, value });
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
  const [cursor, setCursor] = useState(
    initialTransactions.length > 0 ? initialTransactions[initialTransactions.length - 1].id : null
  );
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
  const selectedMonthLabel =
    monthOptions.find((opt) => opt.value === monthFilter)?.label || "All Time";

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

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    });
  };

  const isFiltered = Boolean(search || type !== "ALL" || categoryId !== "ALL" || monthFilter !== "ALL");

  const resetFilters = () => {
    setSearch("");
    setType("ALL");
    setCategoryId("ALL");
    setMonthFilter("ALL");
  };

  return (
    <div className="space-y-4">
      {/* Compact Filters & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs rounded-md bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Filter dropdowns and type segment */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Segment Control */}
          <div className="inline-flex items-center rounded-md border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => setType("ALL")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                type === "ALL"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                type === "INCOME"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                type === "EXPENSE"
                  ? "bg-card text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>
          </div>

          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-card border-border"
              >
                <Filter className="size-3.5 text-muted-foreground" />
                <span className="truncate max-w-[100px]">
                  {categoryId === "ALL"
                    ? "Categories"
                    : categories.find((c) => c.id === categoryId)?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs max-h-56 overflow-y-auto">
              <DropdownMenuItem onClick={() => setCategoryId("ALL")}>All Categories</DropdownMenuItem>
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Month Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-card border-border"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="truncate max-w-[100px]">{selectedMonthLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              {monthOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setMonthFilter(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Transaction List Cards */}
      {paginatedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-border/80 bg-card/60 rounded-xl max-w-md mx-auto my-4">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <Banknote className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No transactions recorded</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {isFiltered
              ? "No transactions match your current search and filters."
              : "Log your first expense or income receipt to start tracking cash flow."}
          </p>
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-3 h-7 text-xs font-medium"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs divide-y divide-border">
          {paginatedTransactions.map((t) => {
            const isIncome = t.type === "INCOME";

            return (
              <div
                key={t.id}
                className="group flex items-center justify-between p-3 sm:p-3.5 hover:bg-muted/30 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-8 rounded-md flex items-center justify-center shrink-0 text-white font-medium shadow-2xs",
                      isIncome ? "bg-emerald-600" : "bg-primary"
                    )}
                    style={{ backgroundColor: t.category?.color || undefined }}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      {t.description || t.category?.name || "Transaction"}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{t.category?.name}</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span>{format(new Date(t.date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatMoney(t.amount, t.currency)}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className="size-7 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {transactions.length > itemsPerPage && (
        <div className="pt-2 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
