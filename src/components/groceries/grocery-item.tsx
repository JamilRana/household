"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ShoppingBasket, Trash2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "@prisma/client";
import { updateItemStatus, deleteGroceryItem } from "@/lib/actions/groceries";
import { formatMoney } from "@/lib/format";

interface GroceryItemProps {
  item: any;
}

export function GroceryItemCard({ item }: GroceryItemProps) {
  // Show the change instantly; the server confirms (or we roll back) a moment later.
  const [override, setOverride] = useState<boolean | null>(null);
  const [removed, setRemoved] = useState(false);
  const isPurchased = override ?? item.status === "PURCHASED";

  const setPurchased = async (purchased: boolean) => {
    setOverride(purchased);
    try {
      await updateItemStatus(item.id, purchased ? "PURCHASED" : "PENDING");
    } catch (err) {
      setOverride(null);
      toast.error(err instanceof Error ? err.message : "Could not update the item");
      return false;
    }
    setOverride(null);
    return true;
  };

  const handleToggle = async () => {
    const next = !isPurchased;
    const ok = await setPurchased(next);
    if (ok && next) {
      toast(`Bought ${item.name}`, { action: { label: "Undo", onClick: () => setPurchased(false) } });
    }
  };

  const handleDelete = async () => {
    setRemoved(true);
    try {
      await deleteGroceryItem(item.id);
    } catch (err) {
      setRemoved(false);
      toast.error(err instanceof Error ? err.message : "Could not remove the item");
    }
  };

  if (removed) return null;

  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-xl transition-all border group",
      isPurchased ? "bg-slate-50 dark:bg-slate-900/40 border-transparent opacity-60" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md"
    )}>
      <button 
        onClick={handleToggle}
        aria-label={isPurchased ? `Put ${item.name} back on the list` : `Mark ${item.name} as bought`}
        aria-pressed={isPurchased}
        className={cn(
          "shrink-0 transition-colors",
          isPurchased ? "text-emerald-500" : "text-slate-300 hover:text-emerald-600"
        )}
      >
        {isPurchased ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
      </button>

      <div className="flex-1 min-w-0">

        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate",
            isPurchased && "line-through text-muted-foreground"
          )}>
            {item.name}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
            {Number(item.quantity)} {item.unit}
          </span>
          {item.actualPrice && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-semibold">
              {formatMoney(item.actualPrice)}
            </span>
          )}
        </div>
        {item.category && (
          <span className="text-xs font-semibold text-emerald-600/60">
            {item.category}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-400 hover:text-red-500"
          onClick={handleDelete}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
