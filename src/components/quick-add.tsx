"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  ListTodo,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getTaskLists, createTask } from "@/lib/actions/tasks";
import {
  getGroceryLists,
  addGroceryItem,
  addGroceryItems,
} from "@/lib/actions/groceries";
import { parseMultiGroceryInput } from "@/lib/grocery-parser";
import { getCategories, createTransaction } from "@/lib/actions/finance";

type Kind = "task" | "grocery" | "expense" | "income";

interface Option {
  id: string;
  name: string;
  type?: string;
  color?: string;
}

const kinds: { id: Kind; label: string; icon: any }[] = [
  { id: "expense", label: "Expense", icon: TrendingDown },
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "task", label: "Task", icon: ListTodo },
  { id: "grocery", label: "Grocery", icon: ShoppingCart },
];

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("expense");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);

  const [taskLists, setTaskLists] = useState<Option[]>([]);
  const [groceryLists, setGroceryLists] = useState<Option[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Option[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Option[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Keyboard shortcut: "c" opens quick add when not focused on an input
  useEffect(() => {
    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ kind?: Kind }>;
      if (customEvent.detail?.kind) {
        setKind(customEvent.detail.kind);
      }
      setOpen(true);
    };
    window.addEventListener("lifehub:quick-add", handleCustom);

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "c") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("lifehub:quick-add", handleCustom);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quickadd:kind") as Kind | null;
      if (saved && kinds.some((k) => k.id === saved)) setKind(saved);
    } catch {}
  }, []);

  // Fetch choices when modal opens
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const [t, g, c] = await Promise.all([
          getTaskLists(),
          getGroceryLists(),
          getCategories(),
        ]);
        setTaskLists((t as any[]).map((l) => ({ id: l.id, name: l.name })));
        setGroceryLists((g as any[]).map((l) => ({ id: l.id, name: l.name })));

        const exp = (c as any[])
          .filter((x) => x.type === "EXPENSE" && !x.isArchived)
          .map((x) => ({ id: x.id, name: x.name, color: x.color }));
        const inc = (c as any[])
          .filter((x) => x.type === "INCOME" && !x.isArchived)
          .map((x) => ({ id: x.id, name: x.name, color: x.color }));

        setExpenseCategories(exp);
        setIncomeCategories(inc);
        setLoaded(true);
      } catch {
        toast.error("Could not load categories and lists");
      }
    })();
  }, [open, loaded]);

  const options: Option[] =
    kind === "task"
      ? taskLists
      : kind === "grocery"
      ? groceryLists
      : kind === "income"
      ? incomeCategories
      : expenseCategories;

  // Sync remembered target
  useEffect(() => {
    if (!options.length) {
      setTargetId("");
      return;
    }
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(`quickadd:target:${kind}`);
    } catch {}
    setTargetId(
      options.some((o) => o.id === remembered) ? (remembered as string) : options[0].id
    );
  }, [kind, options]);

  function pickKind(k: Kind) {
    setKind(k);
    try {
      localStorage.setItem("quickadd:kind", k);
    } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const label = text.trim();
    const isMoney = kind === "expense" || kind === "income";

    if (!isMoney && !label) {
      toast.error("Please enter a name or title");
      return;
    }

    if (isMoney) {
      const val = parseFloat(amount);
      if (!Number.isFinite(val) || val <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      if (!targetId) {
        toast.error(`Create a ${kind} category first in Finance`);
        return;
      }
    } else if (!targetId) {
      toast.error("Select or create a target list first");
      return;
    }

    setSaving(true);
    try {
      if (kind === "expense" || kind === "income") {
        const value = parseFloat(amount);
        await createTransaction({
          type: kind === "income" ? "INCOME" : "EXPENSE",
          amount: value,
          categoryId: targetId,
          date: new Date(),
          description: label || undefined,
          isRecurring: false,
          paymentMethod: "CASH",
        } as any);
        toast.success(
          `${kind === "income" ? "Income" : "Expense"} recorded: $${value.toFixed(2)}`
        );
      } else if (kind === "task") {
        await createTask({
          listId: targetId,
          title: label,
          priority: "MEDIUM",
          dueDate: due ? new Date(`${due}T00:00:00`) : null,
        } as any);
        toast.success(`Task created: ${label}`);
      } else if (kind === "grocery") {
        const parsed = parseMultiGroceryInput(label);
        if (parsed.length > 1) {
          const res = await addGroceryItems({
            listId: targetId || undefined,
            items: parsed.map((p) => ({
              name: p.name,
              quantity: p.quantity,
              unit: p.unit,
            })),
          });
          toast.success(`Added ${res.count} items to grocery list`);
        } else {
          const item = parsed[0] || { name: label, quantity: 1, unit: "pcs" };
          await addGroceryItem({
            listId: targetId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
          } as any);
          toast.success(`Added to grocery list: ${item.name}`);
        }
      }

      try {
        localStorage.setItem(`quickadd:target:${kind}`, targetId);
      } catch {}

      setText("");
      setAmount("");
      setDue("");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        title="Quick add (c)"
        className="fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6 size-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105"
      >
        <Plus className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-md p-5 rounded-xl border border-border bg-card shadow-lg">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
              Quick Capture
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Instantly record an expense, income, task, or inventory item.
            </DialogDescription>
          </DialogHeader>

          {/* Type Selector Tabs */}
          <div
            role="tablist"
            aria-label="Item category"
            className="grid grid-cols-5 gap-1 rounded-lg bg-muted/60 p-1 mt-1"
          >
            {kinds.map((k) => {
              const Icon = k.icon;
              const isSelected = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => pickKind(k.id)}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1 rounded-md py-1.5 px-1 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      k.id === "income" && isSelected
                        ? "text-emerald-500"
                        : k.id === "expense" && isSelected
                        ? "text-rose-500"
                        : ""
                    )}
                  />
                  <span className="truncate">{k.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-3 pt-2">
            {(kind === "expense" || kind === "income") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Amount"
                    autoFocus
                    className="h-9 pl-7 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {kind === "task"
                  ? "Task Title"
                  : kind === "grocery"
                  ? "Item Name"
                  : "Note / Description (Optional)"}
              </label>
              <Input
                placeholder={
                  kind === "task"
                    ? "What needs doing?"
                    : kind === "grocery"
                    ? "e.g. Milk, Eggs, Bread..."
                    : kind === "income"
                    ? "Salary, Freelance client, Dividend..."
                    : "Coffee, Groceries, Dinner..."
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Title or note"
                autoFocus={kind !== "expense" && kind !== "income"}
                maxLength={200}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <span className="text-xs font-medium text-foreground">
                  {kind === "task"
                    ? "Task List"
                    : kind === "grocery"
                    ? "Grocery List"
                    : `${kind === "income" ? "Income" : "Expense"} Category`}
                </span>
                <select
                  className={selectClasses}
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={!options.length}
                >
                  {options.length === 0 && (
                    <option value="">
                      {loaded ? "No categories found" : "Loading..."}
                    </option>
                  )}
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {kind === "task" ? (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-foreground">Due (Optional)</span>
                  <input
                    type="date"
                    className={selectClasses}
                    value={due}
                    min={todayInputValue()}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-foreground">Destination</span>
                  <div className="h-9 flex items-center px-2.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground truncate">
                    {kind === "expense"
                      ? "Balance ledger"
                      : kind === "income"
                      ? "Revenue inflow"
                      : "Shopping list"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  saving ||
                  ((kind === "expense" || kind === "income") && !amount) ||
                  ((kind === "task" || kind === "grocery") &&
                    !text.trim())
                }
              >
                {saving ? "Saving..." : "Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
