import { getPantryItems, getPantryCategories } from "@/lib/actions/groceries";
import { AddPantryItemModal } from "@/components/pantry/AddPantryItemModal";
import { ExpiryTimeline } from "@/components/pantry/ExpiryTimeline";
import { PantryList } from "./components/PantryList";

export default async function PantryPage() {
  const items = await getPantryItems();
  const pantryCategories = await getPantryCategories();

  const baseLocations = ["Pantry", "Fridge", "Freezer"];
  const uniqueLocations = Array.from(new Set([
    ...baseLocations,
    ...items.map(item => item.location || "Pantry")
  ]));

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pantry & Storage
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} items cataloged across pantry, fridge, and freezer.
          </p>
        </div>
        <AddPantryItemModal locations={uniqueLocations} categories={pantryCategories} />
      </header>

      {/* Storage Location Overview Tiles */}
      <section className="grid gap-4 sm:grid-cols-3">
        {uniqueLocations.map((loc) => {
          const locItems = items.filter(i => i.location === loc);
          const expiringCount = locItems.filter(i => {
            if (!i.expiryDate) return false;
            const diff = new Date(i.expiryDate).getTime() - Date.now();
            return diff > 0 && diff < 1000 * 60 * 60 * 24 * 7;
          }).length;

          return (
            <div key={loc} className="rounded-xl border border-border bg-card p-4">
              <span className="text-xs font-medium text-muted-foreground">{loc}</span>
              <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-foreground">
                {locItems.length} <span className="text-xs font-sans text-muted-foreground">items</span>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                {expiringCount > 0 ? `${expiringCount} expiring this week` : "All items fresh"}
              </span>
            </div>
          );
        })}
      </section>

      {/* Expiry Timeline & Full Inventory List */}
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Expiry timeline</h2>
          <ExpiryTimeline items={items} />
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">All pantry items</h2>
          <PantryList initialItems={items} categories={pantryCategories} />
        </section>
      </div>
    </div>
  );
}
