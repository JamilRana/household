"use client";

import { useState } from "react";
import { TransactionType } from "@prisma/client";
import { createCategory, deleteCategory } from "@/lib/actions/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, Trash2 } from "lucide-react";

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

export function CategoryModal({ categories }: { categories: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCategory({ name: name.trim(), type, color });
      setName("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-dashed font-bold gap-2">
            <Settings2 className="h-4 w-4" /> Categories
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Create New */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">New Category</p>
            <div className="flex gap-2">
              <Input
                placeholder="Category name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1">Color:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button onClick={handleCreate} disabled={loading || !name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
              <Plus className="h-4 w-4 mr-2" /> {loading ? "Creating..." : "Add Category"}
            </Button>
          </div>

          {/* Existing Categories */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 group">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                  <span className="font-bold text-sm">{cat.name}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                    {cat.type}
                  </span>
                  {cat.isSystem && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">
                      System
                    </span>
                  )}
                </div>
                {!cat.isSystem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
