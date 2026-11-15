"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBasket, Loader2, Sparkles, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addGroceryItems } from "@/lib/actions/groceries";
import { parseMultiGroceryInput } from "@/lib/grocery-parser";
import { toast } from "sonner";

interface QuickAddGroceryBarProps {
  listId?: string;
  listName?: string;
  className?: string;
}

export function QuickAddGroceryBar({ listId, listName, className }: QuickAddGroceryBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    const parsedItems = parseMultiGroceryInput(raw);
    if (parsedItems.length === 0) {
      toast.error("Please enter item names");
      return;
    }

    setLoading(true);
    try {
      const result = await addGroceryItems({
        listId,
        items: parsedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });

      toast.success(
        `Added ${result.count} ${result.count === 1 ? "item" : "items"} to ${result.listName || listName || "grocery list"}`
      );
      setInput("");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add items to grocery list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleQuickAdd}
      className={`galley-card p-2 sm:p-2.5 flex items-center gap-2 shadow-sm ${className || ""}`}
    >
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 hidden sm:flex">
        <Sparkles className="size-4" />
      </div>

      <div className="flex-1 relative min-w-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Quick add: type items (e.g. Milk, 2 Bread, 6 Eggs, Bananas) and press Enter..."
          disabled={loading}
          className="h-10 text-xs sm:text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent pr-12"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-rule pointer-events-none">
          <span>Enter</span>
          <CornerDownLeft className="size-2.5" />
        </div>
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={loading || !input.trim()}
        className="btn-heat h-9 px-3.5 text-xs font-semibold shrink-0 gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span className="hidden sm:inline">Adding...</span>
          </>
        ) : (
          <>
            <Plus className="size-3.5" />
            <span>Add</span>
          </>
        )}
      </Button>
    </form>
  );
}
