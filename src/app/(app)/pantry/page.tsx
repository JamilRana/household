import { auth } from "@/lib/auth";
import { getPantryItems, getPantryCategories } from "@/lib/actions/groceries";
import { Package, AlertTriangle, ThermometerSnowflake, Refrigerator, Archive, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { AddPantryItemModal } from "@/components/pantry/AddPantryItemModal";
import { ExpiryTimeline } from "@/components/pantry/ExpiryTimeline";
import { PantryList } from "./components/PantryList";

export default async function PantryPage() {
  const items = await getPantryItems();
  const pantryCategories = await getPantryCategories();

  // Dynamically compute all unique storage locations/categories
  const baseLocations = ["Pantry", "Fridge", "Freezer"];
  const uniqueLocations = Array.from(new Set([
    ...baseLocations,
    ...items.map(item => item.location || "Pantry")
  ]));

  const locationMeta = (loc: string) => {
    const l = loc.toLowerCase();
    if (l === "fridge") return { icon: Refrigerator, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" };
    if (l === "freezer") return { icon: ThermometerSnowflake, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" };
    if (l === "pantry") return { icon: Archive, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" };
    return { icon: Package, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" };
  };

  const categories = uniqueLocations.map(loc => ({
    name: loc,
    ...locationMeta(loc)
  }));

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col space-y-1">
          <h1 className="text-6xl font-black tracking-tight flex items-center gap-4">
            <span className="bg-amber-500 w-3 h-14 rounded-2xl inline-block shadow-lg shadow-amber-200" />
            Inventory
          </h1>
          <p className="text-slate-400 text-xl font-bold tracking-tight">Manage your pantry, fridge, and freezer.</p>
        </div>
        <AddPantryItemModal locations={uniqueLocations} categories={pantryCategories} />
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpiryTimeline items={items} />
        </div>
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
          {categories.map((cat) => {
            const catItems = items.filter(i => i.location === cat.name);
            return (
              <Card key={cat.name} className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden rounded-[2.5rem] group hover:shadow-2xl transition-all duration-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 group-hover:rotate-6", cat.bg)}>
                      <cat.icon className={cn("h-6 w-6", cat.color)} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter">{catItems.length}</span>
                  </div>
                  <CardTitle className="pt-4 text-xl font-black">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {catItems.slice(0, 2).map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="truncate flex-1 pr-4 font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                        <span className="bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black uppercase">{Number(item.quantity)} {item.unit}</span>
                      </div>
                    ))}
                    {catItems.length === 0 && (
                      <p className="text-xs text-slate-400 italic font-medium">Empty storage.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-8 pt-8">
        <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
          Catalogue
          <span className="h-2 w-2 rounded-full bg-amber-500" />
        </h2>
        <PantryList initialItems={items} categories={pantryCategories} />
      </div>
    </div>
  );
}
