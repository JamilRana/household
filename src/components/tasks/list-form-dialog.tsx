"use client";
import { useState, useEffect } from "react";
import { User, Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTaskList, updateTaskList } from "@/lib/actions/tasks";
import { getActiveGroupId, getUserGroups } from "@/lib/actions/user";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ListFormDialogProps {
  list?: any | null; // Edit mode if provided
  onRefresh?: () => void;
  trigger?: React.ReactNode;
}

export function ListFormDialog({ list, onRefresh, trigger }: ListFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const router = useRouter();
  
  const isEditMode = !!list;

  useEffect(() => {
    if (open) {
      const load = async () => {
        try {
          const [activeId, groups] = await Promise.all([
            getActiveGroupId(),
            getUserGroups()
          ]);
          setAvailableGroups(groups);
          if (isEditMode && list?.groupId) {
            setGroupId(list.groupId);
            const g = groups.find((group: any) => group.id === list.groupId);
            setActiveGroup(g);
          } else if (activeId) {
            const g = groups.find((group: any) => group.id === activeId);
            setActiveGroup(g);
            setGroupId(g?.id || null);
          } else {
            setActiveGroup(null);
            setGroupId(null);
          }
        } catch (error) {
          console.error("Failed to load groups:", error);
        }
      };
      load();
      
      // Pre-fill form if editing
      if (isEditMode && list) {
        setName(list.name || "");
        setDescription(list.description || "");
        setGroupId(list.groupId || null);
      } else {
        setName("");
        setDescription("");
      }
    }
  }, [open, isEditMode, list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("List name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && list?.id) {
        await updateTaskList(list.id, {
          name: name.trim(),
          description: description.trim() ,
          groupId,
        });
        toast.success("List updated successfully");
      } else {
        const newList = await createTaskList({
          name: name.trim(),
          description: description.trim(),
          groupId,
        });
        toast.success("List created successfully");
        router.push(`/tasks/${newList.id}`);
      }
      onRefresh?.();
      setOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save list");
    } finally {
      setLoading(false);
    }
  };

  const VisibilityOption = ({ 
    isPersonal, 
    group,
    selected,
    onSelect,
    disabled 
  }: { 
    isPersonal: boolean; 
    group?: any;
    selected: boolean;
    onSelect: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || loading}
      className={cn(
        "flex flex-col items-center gap-3 p-4 rounded-[1.5rem] border-2 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed",
        selected
          ? isPersonal 
            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600" 
            : "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
          : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      <div className={cn(
        "size-10 rounded-full flex items-center justify-center transition-colors",
        selected
          ? isPersonal ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
      )}>
        {isPersonal ? <User className="size-5" /> : <Users className="size-5" />}
      </div>
      <div>
        <p className="text-xs font-black">{isPersonal ? "Personal" : "Group"}</p>
        <p className="text-[9px] font-bold opacity-70">
          {isPersonal ? "Only you see this" : group ? `Share with ${group.name}` : "Select a group"}
        </p>
      </div>
      {selected && <Check className="absolute top-3 right-3 size-4 text-current" />}
    </button>
  );

  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
      
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-6 md:p-8 border-none shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-black">
            {isEditMode ? "Edit Task List" : "New Task List"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            {isEditMode ? "Update list details below." : "Create a space to organize your tasks."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              List Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="list-name"
              placeholder="e.g., Household Projects, Work Sprint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-semibold focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              required
            />
          </div>

          {/* Visibility Selection */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              List Visibility
            </Label>
            <div className="grid grid-cols-2 gap-3 relative">
              <VisibilityOption
                isPersonal={true}
                selected={groupId === null}
                onSelect={() => setGroupId(null)}
                disabled={loading}
              />
              <VisibilityOption
                isPersonal={false}
                group={activeGroup}
                selected={groupId !== null}
                onSelect={() => setGroupId(activeGroup?.id || null)}
                disabled={!activeGroup || loading}
              />
            </div>
            {/* Group selector dropdown if multiple groups available */}
            {availableGroups.length > 1 && groupId !== null && (
              <div className="mt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                  Select Group
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map(g => (
                    <Button
                      key={g.id}
                      type="button"
                      variant={groupId === g.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setGroupId(g.id);
                        setActiveGroup(g);
                      }}
                      disabled={loading}
                      className={cn(
                        "rounded-full text-xs font-bold",
                        groupId === g.id 
                          ? "bg-indigo-600 hover:bg-indigo-700" 
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {g.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Description (Optional)
            </Label>
            <Textarea
              id="list-desc"
              placeholder="What's this list for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-medium min-h-[80px] resize-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <DialogFooter className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-11 px-5 rounded-2xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </span>
              ) : (isEditMode ? "Save Changes" : "Create List")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}