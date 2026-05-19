"use client";

import { CheckCircle2, Circle, ShoppingBasket, Trash2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemStatus } from "@prisma/client";
import { updateItemStatus, deleteGroceryItem } from "@/lib/actions/groceries";

interface GroceryItemProps {
  item: any;
}

export function GroceryItemCard({ item }: GroceryItemProps) {
  const isPurchased = item.status === "PURCHASED";
  const isUnavailable = item.status === "UNAVAILABLE";

  const handleToggle = async () => {
    const newStatus = isPurchased ? "PENDING" : "PURCHASED";
    let actualPrice;
    
    if (newStatus === "PURCHASED") {
      const priceStr = prompt(`Enter actual price for ${item.name} (optional):`, item.estimatedPrice ? Number(item.estimatedPrice).toString() : "");
      if (priceStr !== null) {
        actualPrice = parseFloat(priceStr);
      }
    }
    
    await updateItemStatus(item.id, newStatus, actualPrice);
  };

  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-xl transition-all border group",
      isPurchased ? "bg-slate-50 dark:bg-slate-900/40 border-transparent opacity-60" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md"
    )}>
      <button 
        onClick={handleToggle}
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
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-black">
              ${Number(item.actualPrice).toFixed(2)}
            </span>
          )}
        </div>
        {item.category && (
          <span className="text-[10px] uppercase tracking-wider font-black text-emerald-600/60">
            {item.category}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-400 hover:text-red-500"
          onClick={async () => {
            await deleteGroceryItem(item.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
