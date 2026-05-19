"use client";

import { useState } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, Edit2, Check, Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  userId: string | null;
}

const PRESET_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#14B8A6", // Teal
];

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  
  // Create state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    // Call server action
    const category = await createCategory({
      name: newName,
      type: "EXPENSE",
      color: newColor,
    });
    
    setCategories(prev => [...prev, category as Category].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    
    // Optimistic update
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName, color: editColor } : c));
    setEditingId(null);
    
    await updateCategory(id, { name: editName, color: editColor });
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setCategories(prev => prev.filter(c => c.id !== id));
    await deleteCategory(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 rounded-xl transition-all">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border-none bg-white dark:bg-slate-900 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Manage Categories</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Create New Category Form */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add New Category</h4>
            <div className="flex gap-2">
              <Input 
                placeholder="Category name..." 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
              />
              <Button 
                onClick={handleCreate}
                className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-2"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {/* Presets color row */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Color:</span>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform duration-200",
                    newColor === color ? "border-slate-900 dark:border-white scale-125" : "border-transparent hover:scale-110"
                  )}
                />
              ))}
            </div>
          </div>

          {/* List of Categories */}
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3">
                {editingId === cat.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10 bg-white dark:bg-slate-900 font-bold rounded-xl"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/10" 
                        onClick={() => handleRename(cat.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-10 w-10 text-slate-400 hover:text-slate-600 rounded-xl" 
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Edit Color Presets */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Color:</span>
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          style={{ backgroundColor: color }}
                          className={cn(
                            "h-5 w-5 rounded-full border transition-transform duration-200",
                            editColor === color ? "border-slate-900 dark:border-white scale-125" : "border-transparent hover:scale-110"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: cat.color }} />
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{cat.name}</span>
                      {cat.isSystem && (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-widest">
                          System
                        </span>
                      )}
                    </div>
                    
                    {!cat.isSystem && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                            setEditColor(cat.color);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                          onClick={() => handleDelete(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
