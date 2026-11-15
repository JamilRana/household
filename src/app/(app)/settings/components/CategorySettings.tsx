"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransactionType } from "@prisma/client";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  isSystem: boolean;
  userId: string | null;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
];

type FilterType = "ALL" | "EXPENSE" | "INCOME" | "TRANSFER";

export function CategorySettings({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Search & Filter & Pagination state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesType = typeFilter === "ALL" || cat.type === typeFilter;
      const matchesSearch =
        !search.trim() || cat.name.toLowerCase().includes(search.toLowerCase().trim());
      return matchesType && matchesSearch;
    });
  }, [categories, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const counts = useMemo(() => {
    return {
      all: categories.length,
      expense: categories.filter((c) => c.type === "EXPENSE").length,
      income: categories.filter((c) => c.type === "INCOME").length,
      transfer: categories.filter((c) => c.type === "TRANSFER").length,
    };
  }, [categories]);

  const handleStartCreate = () => {
    setEditingId(null);
    setName("");
    setType(typeFilter === "INCOME" ? TransactionType.INCOME : TransactionType.EXPENSE);
    setColor(PRESET_COLORS[0]);
    setShowForm(true);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || PRESET_COLORS[0]);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: name.trim(),
          type,
          color,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, name: name.trim(), type, color }
              : c
          )
        );
        toast.success("Category updated");
      } else {
        const created = await createCategory({
          name: name.trim(),
          type,
          color,
        });
        setCategories((prev) => [created as Category, ...prev]);
        toast.success("Category created");
      }
      handleCancelForm();
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Deleted "${catName}"`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  const getTypeBadge = (catType: TransactionType) => {
    switch (catType) {
      case "INCOME":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="size-2.5" />
            Income
          </span>
        );
      case "TRANSFER":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ArrowRightLeft className="size-2.5" />
            Transfer
          </span>
        );
      case "EXPENSE":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <TrendingDown className="size-2.5" />
            Expense
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" /> Finance Categories
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure income, expense, and transfer ledger categories.
          </p>
        </div>

        {!showForm && (
          <Button
            onClick={handleStartCreate}
            size="sm"
            className="h-8 text-xs font-medium gap-1.5 self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            <span>Add Category</span>
          </Button>
        )}
      </div>

      {/* Expandable Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-3 animate-in fade-in-50 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {editingId ? "Edit Category" : "New Category"}
            </span>
            <button
              type="button"
              onClick={handleCancelForm}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Input
                placeholder="Category name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
                required
              />
            </div>
            <div>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                  <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                  <SelectItem value={TransactionType.TRANSFER}>Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Color:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-5 rounded-full transition-transform",
                    color === c
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelForm}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                size="sm"
                className="h-8 text-xs font-medium"
              >
                {loading ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs & Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
              typeFilter === "ALL"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("EXPENSE")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1",
              typeFilter === "EXPENSE"
                ? "bg-rose-600 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingDown className="size-3" />
            Expense ({counts.expense})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("INCOME")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1",
              typeFilter === "INCOME"
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="size-3" />
            Income ({counts.income})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("TRANSFER")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1",
              typeFilter === "TRANSFER"
                ? "bg-blue-600 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowRightLeft className="size-3" />
            Transfer ({counts.transfer})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search categories by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-1.5 min-h-[200px]">
        {paginatedCategories.length === 0 ? (
          <div className="py-10 text-center space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No categories found</p>
            <p className="text-[11px]">
              {search
                ? "Try searching with different keywords."
                : "No categories match the active filter."}
            </p>
          </div>
        ) : (
          paginatedCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="size-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs font-medium text-foreground truncate">{cat.name}</span>
                {getTypeBadge(cat.type)}
                {cat.isSystem && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted shrink-0">
                    <Lock className="size-2.5 opacity-60" />
                    Default
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartEdit(cat)}
                  title={`Edit ${cat.name}`}
                  aria-label={`Edit ${cat.name}`}
                >
                  <Edit2 className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  title={`Delete ${cat.name}`}
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredCategories.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
          {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of{" "}
          {filteredCategories.length}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-xs"
            className="size-7"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="px-1 font-medium text-foreground text-xs">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            className="size-7"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
