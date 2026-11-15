"use client";

import { useState } from "react";
import {
  Package,
  Trash2,
  Search,
  Filter,
  Calendar,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Minus,
  Edit2,
  X,
  MoreVertical,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, isBefore, addDays, startOfToday } from "date-fns";
import { EditPantryItemModal } from "@/components/pantry/EditPantryItemModal";
import { deletePantryItem, consumePantryItem, updatePantryItem } from "@/lib/actions/groceries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PantryListProps {
  initialItems: any[];
  categories?: any[];
}

const getExpiryMonthOptions = () => {
  const options = [];
  const currentDate = new Date();

  options.push({ label: "All Expiry Dates", value: "ALL_EXPIRY" });
  options.push({ label: "Expired", value: "EXPIRED" });
  options.push({ label: "Expiring This Month", value: "EXP_THIS_MONTH" });
  options.push({ label: "Expiring Next Month", value: "EXP_NEXT_MONTH" });

  for (let i = 0; i < 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const label = format(d, "MMMM yyyy");
    const value = `EXP_${format(d, "yyyy-MM")}`;
    if (i > 1) {
      options.push({ label, value });
    }
  }
  return options;
};

export function PantryList({ initialItems, categories = [] }: PantryListProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [expiryFilter, setExpiryFilter] = useState("ALL_EXPIRY");
  const [view, setView] = useState<"table" | "grid">("table");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const today = startOfToday();
  const nextWeek = addDays(today, 7);
  const expiryOptions = getExpiryMonthOptions();
  const selectedExpiryLabel =
    expiryOptions.find((opt) => opt.value === expiryFilter)?.label || "All Expiry Dates";

  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.category?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (filter && item.location !== filter) return false;

    if (expiryFilter !== "ALL_EXPIRY") {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);

      if (expiryFilter === "EXPIRED") {
        return isBefore(expiry, today);
      }
      if (expiryFilter === "EXP_THIS_MONTH") {
        return (
          expiry.getFullYear() === today.getFullYear() &&
          expiry.getMonth() === today.getMonth()
        );
      }
      if (expiryFilter === "EXP_NEXT_MONTH") {
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return (
          expiry.getFullYear() === nextMonthDate.getFullYear() &&
          expiry.getMonth() === nextMonthDate.getMonth()
        );
      }
      if (expiryFilter.startsWith("EXP_")) {
        const [year, month] = expiryFilter.substring(4).split("-").map(Number);
        return expiry.getFullYear() === year && expiry.getMonth() + 1 === month;
      }
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    await deletePantryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleQuantityChange = async (id: string, change: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const currentQty = Number(item.quantity);
    const newQty = currentQty + change;

    if (newQty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await deletePantryItem(id);
      return;
    }

    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)));
    setUpdatingId(id);

    try {
      if (change < 0) {
        await consumePantryItem(id, Math.abs(change));
      } else {
        await updatePantryItem(id, { quantity: newQty });
      }
    } catch (err) {
      console.error(err);
      setItems(initialItems);
    } finally {
      setUpdatingId(null);
    }
  };

  const isFiltered = Boolean(search || filter || expiryFilter !== "ALL_EXPIRY");

  const resetFilters = () => {
    setSearch("");
    setFilter(null);
    setExpiryFilter("ALL_EXPIRY");
  };

  return (
    <div className="space-y-4">
      {/* Compact Filters & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search pantry items..."
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

        {/* Filter dropdowns & View switch */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Location filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-card border-border"
              >
                <MapPin className="size-3.5 text-muted-foreground" />
                <span>{filter || "All Zones"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-xs">
              <DropdownMenuItem onClick={() => setFilter(null)}>All Zones</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Pantry")}>Pantry</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Fridge")}>Fridge</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Freezer")}>Freezer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expiry filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 bg-card border-border"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="truncate max-w-[110px]">{selectedExpiryLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs max-h-56 overflow-y-auto">
              {expiryOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setExpiryFilter(opt.value)}
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

          {/* View toggle */}
          <div className="inline-flex items-center border border-border rounded-md p-0.5 bg-muted/40 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-label="Table view"
              className={cn(
                "p-1 rounded text-muted-foreground transition-colors cursor-pointer",
                view === "table" ? "bg-card text-foreground shadow-2xs font-semibold" : "hover:text-foreground"
              )}
            >
              <List className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={cn(
                "p-1 rounded text-muted-foreground transition-colors cursor-pointer",
                view === "grid" ? "bg-card text-foreground shadow-2xs font-semibold" : "hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main List Rendering */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-border/80 bg-card/60 rounded-xl max-w-md mx-auto my-4">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <Package className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No items found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {isFiltered
              ? "Try adjusting your search criteria or location filters."
              : "No items recorded in pantry storage."}
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
      ) : view === "table" ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Zone</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Expiry Date</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isExpired = item.expiryDate && isBefore(new Date(item.expiryDate), today);
                  const isExpiringSoon =
                    item.expiryDate &&
                    !isExpired &&
                    isBefore(new Date(item.expiryDate), nextWeek);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.name}</span>
                          {item.category && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded border"
                              style={{
                                color: item.category.color,
                                borderColor: item.category.color + "30",
                                backgroundColor: item.category.color + "10",
                              }}
                            >
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-muted/60 border border-border/60">
                          {item.location || "Pantry"}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="inline-flex items-center gap-1 border border-border rounded-md px-1 py-0.5 bg-background">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="min-w-12 text-center font-medium text-foreground text-xs">
                            {updatingId === item.id ? (
                              <Loader2 className="size-3 animate-spin mx-auto text-primary" />
                            ) : (
                              `${Number(item.quantity)} ${item.unit || "pcs"}`
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        {item.expiryDate ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                              isExpired
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : isExpiringSoon
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            <Clock className="size-3" />
                            {format(new Date(item.expiryDate), "MMM d, yyyy")}
                            {isExpired && " (Expired)"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">No date</span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditPantryItemModal
                            item={item}
                            categories={categories}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded text-muted-foreground hover:text-foreground"
                                aria-label="Edit item"
                              >
                                <Edit2 className="size-3" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="size-7 rounded text-muted-foreground hover:text-destructive"
                            aria-label="Delete item"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isExpired = item.expiryDate && isBefore(new Date(item.expiryDate), today);
            const isExpiringSoon =
              item.expiryDate &&
              !isExpired &&
              isBefore(new Date(item.expiryDate), nextWeek);

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-border bg-card space-y-2 hover:border-border/80 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{item.name}</h4>
                    {item.category && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded border"
                        style={{
                          color: item.category.color,
                          borderColor: item.category.color + "30",
                          backgroundColor: item.category.color + "10",
                        }}
                      >
                        {item.category.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <EditPantryItemModal
                      item={item}
                      categories={categories}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="size-6 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                    {item.location || "Pantry"}
                  </span>

                  <div className="inline-flex items-center gap-1 border border-border rounded-md px-1 py-0.5 bg-background">
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="size-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Decrease"
                    >
                      <Minus className="size-2.5" />
                    </button>
                    <span className="min-w-10 text-center font-medium text-foreground text-[11px]">
                      {updatingId === item.id ? (
                        <Loader2 className="size-2.5 animate-spin mx-auto text-primary" />
                      ) : (
                        `${Number(item.quantity)} ${item.unit || "pcs"}`
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="size-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Increase"
                    >
                      <Plus className="size-2.5" />
                    </button>
                  </div>
                </div>

                {item.expiryDate && (
                  <div className="pt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border w-full justify-center",
                        isExpired
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                          : isExpiringSoon
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <Clock className="size-2.5" />
                      Expires: {format(new Date(item.expiryDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
