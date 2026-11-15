"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addGroceryItems } from "@/lib/actions/groceries";
import { parseMultiGroceryInput } from "@/lib/grocery-parser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Sparkles, ClipboardList, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COMMON_STAPLES = [
  "Milk",
  "Eggs",
  "Bread",
  "Butter",
  "Bananas",
  "Apples",
  "Chicken breast",
  "Rice",
  "Pasta",
  "Coffee",
  "Cheese",
  "Tomatoes",
  "Onions",
  "Potatoes",
];

const COMMON_UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "box", "can", "bag", "bunch", "dozen"];

interface ItemRow {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
  estimatedPrice: string;
}

interface AddGroceryItemModalProps {
  lists?: { id: string; name: string }[];
  defaultListId?: string;
  categories?: {
    id: string;
    name: string;
    color: string;
    isSystem: boolean;
  }[];
  trigger?: React.ReactNode;
}

export function AddGroceryItemModal({
  lists = [],
  defaultListId,
  categories = [],
  trigger,
}: AddGroceryItemModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"rows" | "paste">("rows");
  const [loading, setLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>(
    defaultListId || lists[0]?.id || ""
  );
  const [pasteText, setPasteText] = useState("");
  const router = useRouter();

  const [rows, setRows] = useState<ItemRow[]>([
    {
      id: "row-1",
      name: "",
      quantity: "1",
      unit: "pcs",
      categoryId: "none",
      estimatedPrice: "",
    },
  ]);

  // Keep selected list in sync if defaultListId or lists change
  useEffect(() => {
    if (defaultListId) {
      setSelectedListId(defaultListId);
    } else if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id);
    }
  }, [defaultListId, lists, selectedListId]);

  const addEmptyRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        quantity: "1",
        unit: "pcs",
        categoryId: "none",
        estimatedPrice: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          name: "",
          quantity: "1",
          unit: "pcs",
          categoryId: "none",
          estimatedPrice: "",
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ItemRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addStapleChip = (stapleName: string) => {
    // If first row is empty, fill it
    if (rows.length === 1 && !rows[0].name.trim()) {
      setRows([
        {
          id: rows[0].id,
          name: stapleName,
          quantity: "1",
          unit: "pcs",
          categoryId: "none",
          estimatedPrice: "",
        },
      ]);
      return;
    }

    // Otherwise append new row
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        name: stapleName,
        quantity: "1",
        unit: "pcs",
        categoryId: "none",
        estimatedPrice: "",
      },
    ]);
  };

  const handleConvertPasteToRows = () => {
    const parsed = parseMultiGroceryInput(pasteText);
    if (parsed.length === 0) {
      toast.error("No items found. Enter items separated by newlines or commas.");
      return;
    }

    const convertedRows: ItemRow[] = parsed.map((item, index) => ({
      id: `row-${Date.now()}-${index}`,
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit || "pcs",
      categoryId: "none",
      estimatedPrice: "",
    }));

    setRows(convertedRows);
    setPasteText("");
    setMode("rows");
    toast.success(`Imported ${convertedRows.length} items`);
  };

  const validItemsCount =
    mode === "rows"
      ? rows.filter((r) => r.name.trim().length > 0).length
      : parseMultiGroceryInput(pasteText).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let itemsToCreate: Array<{
      name: string;
      quantity: number;
      unit: string;
      category?: string;
      estimatedPrice?: number;
    }> = [];

    if (mode === "rows") {
      itemsToCreate = rows
        .filter((r) => r.name.trim().length > 0)
        .map((r) => {
          const selectedCategory = categories.find((c) => c.id === r.categoryId)?.name ||
            (r.categoryId && r.categoryId !== "none" ? r.categoryId : undefined);

          return {
            name: r.name.trim(),
            quantity: parseFloat(r.quantity) > 0 ? parseFloat(r.quantity) : 1,
            unit: r.unit.trim() || "pcs",
            category: selectedCategory,
            estimatedPrice: r.estimatedPrice ? parseFloat(r.estimatedPrice) : undefined,
          };
        });
    } else {
      const parsed = parseMultiGroceryInput(pasteText);
      itemsToCreate = parsed.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }));
    }

    if (itemsToCreate.length === 0) {
      toast.error("Please enter at least one item name");
      return;
    }

    setLoading(true);
    try {
      const res = await addGroceryItems({
        listId: selectedListId || undefined,
        items: itemsToCreate,
      });

      toast.success(
        `Added ${res.count} ${res.count === 1 ? "item" : "items"} to ${res.listName || "grocery list"}`
      );
      setOpen(false);

      // Reset rows
      setRows([
        {
          id: `row-${Date.now()}`,
          name: "",
          quantity: "1",
          unit: "pcs",
          categoryId: "none",
          estimatedPrice: "",
        },
      ]);
      setPasteText("");

      // Force Next.js router cache to refresh immediately
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add items to grocery list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="btn-heat h-8 sm:h-9 text-xs font-semibold gap-1.5 shadow-md">
            <Plus className="size-3.5" />
            <span>Add Items</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-2xl p-5 sm:p-6 rounded-2xl border border-rule bg-card/95 backdrop-blur-xl shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-1 pb-3 border-b border-rule shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Add Grocery Items
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add multiple items simultaneously or paste your shopping list.
              </DialogDescription>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-muted/60 p-0.5 rounded-lg border border-rule text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode("rows")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors",
                  mode === "rows"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Rows3 className="size-3.5" />
                <span>Itemized</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors",
                  mode === "paste"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ClipboardList className="size-3.5" />
                <span>Quick Paste</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-3 space-y-4">
          {/* Target Grocery List Selector */}
          <div className="space-y-1.5 shrink-0">
            <label className="text-xs font-semibold text-foreground">Destination List</label>
            {lists.length > 0 ? (
              <Select value={selectedListId} onValueChange={(val) => setSelectedListId(val || "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select grocery list" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                Will automatically save to <b>My Shopping List</b>
              </div>
            )}
          </div>

          {/* Mode 1: Multi-Item Rows */}
          {mode === "rows" && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
              <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0 px-1">
                <span className="font-semibold text-foreground">Items ({rows.length})</span>
                <span className="text-[11px]">Press Enter in name to add next row</span>
              </div>

              {/* Rows List (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 p-2 rounded-xl border border-rule bg-card/60 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <Input
                        placeholder={index === 0 ? "e.g. Sourdough Bread..." : `Item #${index + 1}...`}
                        value={row.name}
                        onChange={(e) => updateRow(row.id, "name", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addEmptyRow();
                          }
                        }}
                        autoFocus={index === rows.length - 1 && index === 0}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="w-16 shrink-0">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                        className="h-8 text-xs font-mono text-center"
                      />
                    </div>

                    <div className="w-20 shrink-0">
                      <select
                        value={row.unit}
                        onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    {categories.length > 0 && (
                      <div className="w-28 shrink-0 hidden sm:block">
                        <select
                          value={row.categoryId}
                          onChange={(e) => updateRow(row.id, "categoryId", e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-ring truncate"
                        >
                          <option value="none">Category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                      title="Remove row"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Row Button & Staples Chips */}
              <div className="shrink-0 space-y-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmptyRow}
                  className="w-full h-8 border-dashed border-rule text-xs gap-1.5 hover:bg-muted/50"
                >
                  <Plus className="size-3.5" />
                  <span>Add another item</span>
                </Button>

                {/* Quick Add Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" /> Popular Staples (Click to add):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {COMMON_STAPLES.map((staple) => (
                      <button
                        key={staple}
                        type="button"
                        onClick={() => addStapleChip(staple)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary border border-rule transition-colors cursor-pointer"
                      >
                        + {staple}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Quick Paste Textarea */}
          {mode === "paste" && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Paste or type grocery list
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Separate items by new lines or commas. Quantities like &quot;2 Milk&quot; or &quot;1.5 kg Tomatoes&quot; are automatically parsed!
                </p>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Milk\n2 dozen Eggs\nWhole Wheat Bread\n1.5 kg Apples\nGreek Yogurt\nCoffee Beans`}
                className="flex-1 min-h-[160px] p-3 rounded-xl border border-rule bg-card/60 text-xs font-mono text-foreground focus-visible:ring-1 focus-visible:ring-ring outline-none resize-none"
                autoFocus
              />

              {pasteText.trim() && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                  <span className="font-medium text-foreground">
                    {parseMultiGroceryInput(pasteText).length} items detected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleConvertPasteToRows}
                    className="h-7 text-xs text-primary"
                  >
                    Convert to Itemized Rows →
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-rule shrink-0 flex items-center justify-between gap-2 sm:justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {validItemsCount} {validItemsCount === 1 ? "item" : "items"} ready
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || validItemsCount === 0}
                className="btn-heat h-9 text-xs font-semibold gap-1.5 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Adding items...</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    <span>
                      Add {validItemsCount > 0 ? `${validItemsCount} ` : ""}
                      {validItemsCount === 1 ? "Item" : "Items"} to List
                    </span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
