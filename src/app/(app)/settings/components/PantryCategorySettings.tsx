"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPantryCategory,
  deletePantryCategory,
  updatePantryCategory,
} from "@/lib/actions/groceries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PantryCategory {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  userId: string | null;
}

const PRESET_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
];

export function PantryCategorySettings({
  initialCategories,
}: {
  initialCategories: PantryCategory[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<PantryCategory[]>(initialCategories);

  // Search & Pagination state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      return (
        !search.trim() || cat.name.toLowerCase().includes(search.toLowerCase().trim())
      );
    });
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const handleStartCreate = () => {
    setEditingId(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setShowForm(true);
  };

  const handleStartEdit = (cat: PantryCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
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
        await updatePantryCategory(editingId, {
          name: name.trim(),
          color,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, name: name.trim(), color }
              : c
          )
        );
        toast.success("Category updated");
      } else {
        const created = await createPantryCategory({
          name: name.trim(),
          color,
        });
        setCategories((prev) => [created as PantryCategory, ...prev]);
        toast.success("Pantry category created");
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
      await deletePantryCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Deleted "${catName}"`);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="size-4 text-primary" /> Pantry Categories
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize pantry and grocery storage inventory sections.
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
              {editingId ? "Edit Pantry Category" : "New Pantry Category"}
            </span>
            <button
              type="button"
              onClick={handleCancelForm}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div>
            <Input
              placeholder="e.g. Produce, Dairy, Spices..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              autoFocus
              required
            />
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search pantry categories..."
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

      {/* Category List */}
      <div className="space-y-1.5 min-h-[200px]">
        {paginatedCategories.length === 0 ? (
          <div className="py-10 text-center space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No pantry categories found</p>
            <p className="text-[11px]">
              {search
                ? "Try searching with different keywords."
                : "Add your first custom pantry category above."}
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
