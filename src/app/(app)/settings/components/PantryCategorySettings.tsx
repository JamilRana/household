"use client";

import { useState } from "react";
import { createPantryCategory, deletePantryCategory, updatePantryCategory } from "@/lib/actions/groceries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Check, X, Plus, ChevronLeft, ChevronRight, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

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
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#14B8A6", // Teal
];

export function PantryCategorySettings({ initialCategories }: { initialCategories: PantryCategory[] }) {
  const [categories, setCategories] = useState<PantryCategory[]>(initialCategories);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Create State
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  // Calculations for pagination
  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const category = await createPantryCategory({
      name: newName,
      color: newColor,
    });
    setCategories(prev => [...prev, category as PantryCategory].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName, color: editColor } : c));
    setEditingId(null);
    await updatePantryCategory(id, { name: editName, color: editColor });
  };

  const handleDelete = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    // Reset page if it becomes empty
    const remainingCount = categories.length - 1;
    const maxPage = Math.ceil(remainingCount / itemsPerPage) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
    await deletePantryCategory(id);
  };

  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden rounded-[2rem]">
      <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Apple className="h-5 w-5 text-amber-500" /> Pantry Categories
          </CardTitle>
          <p className="text-xs text-muted-foreground font-bold mt-1">Configure your custom and system default pantry categories.</p>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        
        {/* Create Form */}
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add New Pantry Category</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="e.g. Produce, Snacks, Bakery..." 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
            />
            <Button 
              onClick={handleCreate}
              className="h-11 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold gap-2 self-stretch sm:self-auto shrink-0 animate-in fade-in zoom-in-95 duration-200"
            >
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
          {/* Preset Colors */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Color Tag:</span>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                style={{ backgroundColor: color }}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform duration-200",
                  newColor === color ? "border-slate-900 dark:border-white scale-125 shadow-md" : "border-transparent hover:scale-110"
                )}
              />
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="pb-4 pl-4 w-20">Tag</th>
                <th className="pb-4">Category Name</th>
                <th className="pb-4 w-32">Source</th>
                <th className="pb-4 pr-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.map((cat) => (
                <tr 
                  key={cat.id} 
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors"
                >
                  {/* Tag Color Column */}
                  <td className="py-4 pl-4">
                    {editingId === cat.id ? (
                      <div className="flex gap-1.5">
                        {PRESET_COLORS.slice(0, 4).map(color => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            style={{ backgroundColor: color }}
                            className={cn(
                              "h-4 w-4 rounded-full border transition-transform",
                              editColor === color ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full shadow-inner" style={{ backgroundColor: cat.color }} />
                    )}
                  </td>

                  {/* Name Column */}
                  <td className="py-4 font-bold text-slate-800 dark:text-slate-200">
                    {editingId === cat.id ? (
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 max-w-xs font-bold rounded-lg bg-white dark:bg-slate-900"
                      />
                    ) : (
                      cat.name
                    )}
                  </td>

                  {/* Source Column */}
                  <td className="py-4">
                    {cat.isSystem ? (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-855 text-slate-400 uppercase tracking-widest">
                        System Default
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 uppercase tracking-widest">
                        Custom
                      </span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 pr-4 text-right">
                    {editingId === cat.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          size="icon" 
                          className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                          onClick={() => handleRename(cat.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">No categories created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="pt-2">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

      </CardContent>
    </Card>
  );
}
