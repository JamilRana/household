import { getPantryItems, getPantryCategories } from "@/lib/actions/groceries";
import { AddPantryItemModal } from "@/components/pantry/AddPantryItemModal";
import { ExpiryTimeline } from "@/components/pantry/ExpiryTimeline";
import { PantryList } from "./components/PantryList";
import { Package, Refrigerator, Snowflake, Clock } from "lucide-react";

export const metadata = { title: "Pantry" };

export default async function PantryPage() {
  const items = await getPantryItems();
  const pantryCategories = await getPantryCategories();

  const pantryCount = items.filter((i) => (i.location || "Pantry") === "Pantry").length;
  const fridgeCount = items.filter((i) => i.location === "Fridge").length;
  const freezerCount = items.filter((i) => i.location === "Freezer").length;

  const expiringThisWeek = items.filter((i) => {
    if (!i.expiryDate) return false;
    const diff = new Date(i.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 7;
  }).length;

  const baseLocations = ["Pantry", "Fridge", "Freezer"];
  const uniqueLocations = Array.from(
    new Set([...baseLocations, ...items.map((item) => item.location || "Pantry")])
  );

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Pantry & Storage</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              Inventory & Shelf Life
            </span>
          </div>
          <p>
            {items.length} items cataloged across pantry, fridge, and freezer storage zones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <AddPantryItemModal locations={uniqueLocations} categories={pantryCategories} />
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">PANTRY</span>
          <b className="stat-val">{pantryCount}</b>
          <small className="stat-sub">Dry & ambient items</small>
        </div>

        <div>
          <span className="stat-label">FRIDGE</span>
          <b className="stat-val text-sky-500">{fridgeCount}</b>
          <small className="stat-sub">Chilled storage</small>
        </div>

        <div>
          <span className="stat-label">FREEZER</span>
          <b className="stat-val text-indigo-500">{freezerCount}</b>
          <small className="stat-sub">Frozen reserves</small>
        </div>

        <div>
          <span className="stat-label">EXPIRING SOON</span>
          <b className="stat-val text-amber-600 dark:text-amber-400">{expiringThisWeek}</b>
          <small className="stat-sub">Use within 7 days</small>
        </div>
      </div>

      {/* Expiry Timeline Section in Galley Card */}
      <div className="galley-card space-y-3">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Expiry Timeline</h2>
            <p className="text-xs text-muted-foreground">Shelf life distribution across stored goods</p>
          </div>
        </div>
        <ExpiryTimeline items={items} />
      </div>

      {/* Full Pantry Inventory Section in Galley Card */}
      <div className="galley-card space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Inventory Items</h2>
            <p className="text-xs text-muted-foreground">{items.length} total items in household stock</p>
          </div>
        </div>
        <PantryList initialItems={items} categories={pantryCategories} />
      </div>
    </div>
  );
}
