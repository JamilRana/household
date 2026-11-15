"use client";

import { useState, useEffect } from "react";
import { User, Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const router = useRouter();

  const isEditMode = !!list;

  useEffect(() => {
    if (open) {
      const load = async () => {
        try {
          const [activeId, groups] = await Promise.all([
            getActiveGroupId(),
            getUserGroups(),
          ]);
          setAvailableGroups(groups);
          if (isEditMode && list?.groupId) {
            setGroupId(list.groupId);
          } else if (activeId) {
            const g = groups.find((group: any) => group.id === activeId);
            setGroupId(g?.id || null);
          } else {
            setGroupId(null);
          }
        } catch (error) {
          console.error("Failed to load groups:", error);
        }
      };
      load();

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
          description: description.trim(),
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

  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              {isEditMode ? "Edit Task List" : "New Task List"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditMode ? "Update list parameters and sharing." : "Create a container for related tasks."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-name" className="text-xs font-medium text-foreground">
                List Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="list-name"
                placeholder="e.g., Sprint Goals, Weekly Errands"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="h-9"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                List Visibility
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGroupId(null)}
                  disabled={loading}
                  className={cn(
                    "relative flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all",
                    groupId === null
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 text-muted-foreground bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "size-7 rounded-md flex items-center justify-center shrink-0",
                      groupId === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <User className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Personal</p>
                    <p className="text-[11px] text-muted-foreground truncate">Private to you</p>
                  </div>
                  {groupId === null && <Check className="absolute top-2.5 right-2.5 size-3.5 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (availableGroups.length > 0) {
                      setGroupId(availableGroups[0].id);
                    }
                  }}
                  disabled={loading || availableGroups.length === 0}
                  className={cn(
                    "relative flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all",
                    groupId !== null
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 text-muted-foreground bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "size-7 rounded-md flex items-center justify-center shrink-0",
                      groupId !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Users className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Team / Group</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {availableGroups.length > 0 ? "Shared with team" : "No teams"}
                    </p>
                  </div>
                  {groupId !== null && <Check className="absolute top-2.5 right-2.5 size-3.5 text-primary" />}
                </button>
              </div>

              {groupId !== null && availableGroups.length > 1 && (
                <div className="pt-2">
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full h-8 text-xs px-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {availableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="list-desc" className="text-xs font-medium text-foreground">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="list-desc"
                placeholder="What is this list used for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || !name.trim()}>
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : isEditMode ? (
                  "Save Changes"
                ) : (
                  "Create List"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
