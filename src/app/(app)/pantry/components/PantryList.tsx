"use client";

import { useState } from "react";
import { Package, Archive, Refrigerator, ThermometerSnowflake, Trash2, Search, Filter, MoreHorizontal, Calendar, LayoutGrid, List, Loader2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, isBefore, isAfter, addDays, startOfToday } from "date-fns";
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
  
  options.push({ label: "All Expiring Items", value: "ALL_EXPIRY" });
  options.push({ label: "Expired Already", value: "EXPIRED" });
  options.push({ label: "Expiring This Month", value: "EXP_THIS_MONTH" });
  options.push({ label: "Expiring Next Month", value: "EXP_NEXT_MONTH" });

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const label = `Expires in ${format(d, "MMMM yyyy")}`;
    const value = `EXP_${format(d, "yyyy-MM")}`;
    options.push({ label, value });
  }
  return options;
};

export function PantryList({ initialItems, categories = [] }: PantryListProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null); // location names
  const [expiryFilter, setExpiryFilter] = useState("ALL_EXPIRY");
  const [view, setView] = useState<"table" | "grid">("table");

  const today = startOfToday();
  const nextWeek = addDays(today, 7);
  const expiryOptions = getExpiryMonthOptions();
  const selectedExpiryLabel = expiryOptions.find(opt => opt.value === expiryFilter)?.label || "All Expiring Items";

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Location filter
    if (filter) {
      if (item.location !== filter) return false;
    }

    // Expiry filter
    if (expiryFilter !== "ALL_EXPIRY") {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      
      if (expiryFilter === "EXPIRED") {
        return isBefore(expiry, today);
      }
      if (expiryFilter === "EXP_THIS_MONTH") {
        return expiry.getFullYear() === today.getFullYear() && expiry.getMonth() === today.getMonth();
      }
      if (expiryFilter === "EXP_NEXT_MONTH") {
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return expiry.getFullYear() === nextMonthDate.getFullYear() && expiry.getMonth() === nextMonthDate.getMonth();
      }
      if (expiryFilter.startsWith("EXP_")) {
        const [year, month] = expiryFilter.substring(4).split("-").map(Number);
        return expiry.getFullYear() === year && (expiry.getMonth() + 1) === month;
      }
    }
    
    return true;
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deletePantryItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleQuantityChange = async (id: string, change: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const currentQty = Number(item.quantity);
    const newQty = currentQty + change;

    if (newQty <= 0) {
      // Optimistic delete
      setItems(prev => prev.filter(i => i.id !== id));
      await deletePantryItem(id);
      return;
    }

    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search inventory..." 
            className="pl-12 h-12 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[10px] gap-2">
                <Calendar className="h-4 w-4" />
                {selectedExpiryLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 max-h-[300px] overflow-y-auto min-w-[200px]">
              {expiryOptions.map(opt => (
                <DropdownMenuItem key={opt.value} onClick={() => setExpiryFilter(opt.value)} className="rounded-xl font-bold">
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[10px] gap-2">
                <Filter className="h-4 w-4" />
                {filter || "All Locations"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 min-w-[180px]">
              <DropdownMenuItem onClick={() => setFilter(null)} className="rounded-xl font-bold">All Locations</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Fridge")} className="rounded-xl font-bold">Fridge</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Freezer")} className="rounded-xl font-bold">Freezer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Pantry")} className="rounded-xl font-bold">Pantry</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setView("table")}
              className={cn("rounded-xl h-10 w-10", view === "table" ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400")}
            >
              <List className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setView("grid")}
              className={cn("rounded-xl h-10 w-10", view === "grid" ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400")}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Item</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quantity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Location</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expiry</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-lg">{item.name}</span>
                      {item.category && (
                        <span 
                          className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full border shadow-sm uppercase tracking-wider w-fit"
                          style={{ 
                            color: item.category.color, 
                            borderColor: item.category.color + '40', 
                            backgroundColor: item.category.color + '10' 
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.category.color }} />
                          {item.category.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-muted-foreground font-bold">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl p-1 gap-1 w-fit">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={updatingId === item.id}
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      
                      <div className="min-w-[60px] text-center flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-xs">
                        {updatingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                        ) : (
                          `${Number(item.quantity)} ${item.unit}`
                        )}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={updatingId === item.id}
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest",
                      item.location === "Fridge" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                      item.location === "Freezer" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : 
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    )}>
                      {item.location}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {item.expiryDate ? (
                      <div className={cn(
                        "flex items-center gap-2 font-bold",
                        isBefore(new Date(item.expiryDate), today) ? "text-rose-500" :
                        isBefore(new Date(item.expiryDate), nextWeek) ? "text-amber-500" :
                        "text-slate-400"
                      )}>
                        <Calendar className="h-4 w-4" />
                        {format(new Date(item.expiryDate), "MMM d, yyyy")}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditPantryItemModal item={item} />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(item.id)}
                        className="h-10 w-10 text-slate-300 hover:text-rose-500 rounded-xl transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Grid view (always used on mobile, toggleable on desktop) */}
      <div className={cn(
        "grid gap-6",
        view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "md:hidden grid-cols-1"
      )}>
        {filteredItems.map(item => (
          <Card key={item.id} className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{item.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                      item.location === "Fridge" ? "bg-blue-100 text-blue-700" :
                      item.location === "Freezer" ? "bg-indigo-100 text-indigo-700" : 
                      "bg-amber-100 text-amber-700"
                    )}>
                      {item.location}
                    </span>
                    {item.category && (
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-md border shadow-sm uppercase tracking-wider"
                        style={{ 
                          color: item.category.color, 
                          borderColor: item.category.color + '40', 
                          backgroundColor: item.category.color + '10' 
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.category.color }} />
                        {item.category.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-bold">{Number(item.quantity)} {item.unit}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <EditPantryItemModal item={item} categories={categories} />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleDelete(item.id)}
                    className="h-9 w-9 text-slate-300 hover:text-rose-500 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {item.expiryDate && (
                <div className={cn(
                  "mt-4 p-4 rounded-2xl flex items-center gap-3",
                  isBefore(new Date(item.expiryDate), today) ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" :
                  isBefore(new Date(item.expiryDate), nextWeek) ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20" :
                  "bg-slate-50 text-slate-500 dark:bg-slate-800/50"
                )}>
                  <Calendar className="h-5 w-5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Expires</p>
                    <p className="text-sm font-bold">{format(new Date(item.expiryDate), "MMMM d, yyyy")}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl p-1 gap-1 flex-1 justify-between">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={updatingId === item.id}
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-center flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-xs flex-1">
                    {updatingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    ) : (
                      `${Number(item.quantity)} ${item.unit}`
                    )}
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={updatingId === item.id}
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleDelete(item.id)}
                  className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 border-dashed rounded-xl h-10 px-4 font-bold text-xs"
                >
                  Use Up
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-32 text-center">
          <Package className="h-20 w-20 text-slate-200 mx-auto mb-6" />
          <p className="text-slate-400 text-xl font-black italic">No items found matching your filters.</p>
          <Button variant="link" onClick={() => { setSearch(""); setFilter(null); }} className="mt-4 text-blue-600 font-bold uppercase tracking-widest text-xs">Clear all filters</Button>
        </div>
      )}
    </div>
  );
}
