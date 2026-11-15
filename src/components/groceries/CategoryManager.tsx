"use client";

import { useState } from "react";
import { Plus, Settings2, Trash2, Edit2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createPantryCategory, updatePantryCategory, deletePantryCategory } from "@/lib/actions/groceries";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

interface CategoryManagerProps {
  categories?: {
    id: string;
    name: string;
    color: string;
    isSystem: boolean;
  }[];
  initialCategories?: any[];
  trigger?: React.ReactNode;
}

export function CategoryManager({ categories: passedCategories, initialCategories, trigger }: CategoryManagerProps) {
  const categories = passedCategories || initialCategories || [];
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createPantryCategory({
        name: newName.trim(),
        color: newColor,
      });
      setNewName("");
      toast.success("Category created");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updatePantryCategory(id, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      toast.success("Category updated");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update category");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePantryCategory(id);
      toast.success("Category deleted");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 text-xs font-medium gap-1.5 shadow-2xs"
            >
              <Settings2 className="size-3.5 text-muted-foreground" />
              <span>Categories</span>
            </Button>
          )
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Manage Grocery Categories
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Group pantry and grocery items by section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Create New Category Form */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-3">
            <span className="text-xs font-medium text-foreground">Add New Category</span>
            <div className="flex gap-2">
              <Input
                placeholder="Category name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 flex-1"
              />
              <Button
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
              >
                <Plus className="size-3.5" />
                <span>{loading ? "Adding..." : "Add"}</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center pt-1">
              <span className="text-xs text-muted-foreground mr-1">Color:</span>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    "size-5 rounded-full transition-transform",
                    newColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                  )}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* List of Existing Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Existing Categories</span>
              <span>{categories.length} total</span>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors group"
                >
                  {editingId === cat.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon-xs"
                          className="size-8"
                          onClick={() => handleRename(cat.id)}
                          aria-label="Save"
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="size-8"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground mr-1">Color:</span>
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            style={{ backgroundColor: color }}
                            className={cn(
                              "size-4 rounded-full transition-transform",
                              editColor === color ? "ring-2 ring-primary ring-offset-1 scale-125" : "opacity-80"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="size-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-medium text-foreground truncate">{cat.name}</span>
                        {cat.isSystem && (
                          <span className="text-[10px] font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10 shrink-0">
                            System
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                            setEditColor(cat.color);
                          }}
                          aria-label="Edit"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(cat.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
