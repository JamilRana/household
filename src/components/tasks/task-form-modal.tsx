"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Flag,
  Layout,
  Type,
  AlignLeft,
  Users,
  Check,
  Plus,
} from "lucide-react";
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
import { createTask, updateTask, getGroupMembersByList } from "@/lib/actions/tasks";
import type { Priority, TaskStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface TaskFormModalProps {
  lists: any[];
  defaultListId?: string;
  task?: any | null; // If provided, edit mode; else create mode
  onRefresh?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TaskFormModal({
  lists,
  defaultListId,
  task,
  onRefresh,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: TaskFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const fallbackListId = defaultListId || lists[0]?.id || "";

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    listId: fallbackListId,
    priority: "MEDIUM" as Priority,
    dueDate: "",
    description: "",
    assignedUserIds: [] as string[],
    status: "NOT_STARTED" as TaskStatus,
  });

  const [members, setMembers] = useState<any[]>([]);
  const isEditMode = Boolean(task);

  // Initialize form data when task or modal opens
  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.title || "",
          listId: task.listId || fallbackListId,
          priority: task.priority || "MEDIUM",
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : "",
          description: task.description || "",
          assignedUserIds: task.assignments?.map((a: any) => a.userId) || [],
          status: task.status || "NOT_STARTED",
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          listId: defaultListId || lists[0]?.id || prev.listId,
          title: "",
          description: "",
          dueDate: "",
          assignedUserIds: [],
        }));
      }

      const activeListId = task?.listId || defaultListId || lists[0]?.id;
      if (activeListId) {
        getGroupMembersByList(activeListId)
          .then(setMembers)
          .catch(() => setMembers([]));
      }
    }
  }, [open, task, lists, defaultListId, fallbackListId]);

  // Load members when list changes
  useEffect(() => {
    if (formData.listId && open) {
      getGroupMembersByList(formData.listId)
        .then(setMembers)
        .catch(() => setMembers([]));
    }
  }, [formData.listId, open]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter((id) => id !== userId)
        : [...prev.assignedUserIds, userId],
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim() || !formData.listId) {
      toast.error("Title and list are required");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && task?.id) {
        await updateTask(task.id, {
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        });
        toast.success("Task updated");
      } else {
        await createTask({
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        });
        toast.success("Task created");
      }
      onRefresh?.();
      setOpen(false);
      if (!isEditMode) {
        setFormData((prev) => ({
          ...prev,
          title: "",
          description: "",
          dueDate: "",
          assignedUserIds: [],
        }));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isEditMode ? "Edit Task" : "Create New Task";
  const submitLabel = loading
    ? isEditMode
      ? "Saving..."
      : "Creating..."
    : isEditMode
    ? "Save Changes"
    : "Create Task";

  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-lg p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditMode
                ? "Update task parameters and assignments."
                : "Add a task to organize your work."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Target List Selection */}
            {lists.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Layout className="size-3.5 text-muted-foreground" />
                  List
                </Label>
                <Select
                  value={formData.listId}
                  onValueChange={(val) => updateField("listId", val)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 rounded-md text-sm">
                    <SelectValue placeholder="Select target list" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id} className="text-xs py-2">
                        {list.name} {list.groupId ? "(Group)" : "(Personal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Type className="size-3.5 text-muted-foreground" />
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                disabled={loading}
                className="h-9 rounded-md text-sm font-medium"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <AlignLeft className="size-3.5 text-muted-foreground" />
                Description
              </Label>
              <Textarea
                placeholder="Add optional notes or checklist items..."
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                disabled={loading}
                className="min-h-20 rounded-md text-xs leading-relaxed"
                rows={3}
              />
            </div>

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Flag className="size-3.5 text-muted-foreground" />
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => updateField("priority", v as Priority)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 rounded-md text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="LOW" className="text-xs">
                      Low
                    </SelectItem>
                    <SelectItem value="MEDIUM" className="text-xs">
                      Medium
                    </SelectItem>
                    <SelectItem value="HIGH" className="text-xs">
                      High
                    </SelectItem>
                    <SelectItem value="URGENT" className="text-xs">
                      Urgent
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => updateField("dueDate", e.target.value)}
                  disabled={loading}
                  className="h-9 rounded-md text-xs [color-scheme:light_dark]"
                />
              </div>
            </div>

            {/* Member Assignments */}
            {members.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" />
                  Assign to members
                </Label>
                <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60 min-h-10 items-center">
                  {members.map((member) => {
                    const isSelected = formData.assignedUserIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        disabled={loading}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Avatar className="size-4 shrink-0">
                          <AvatarImage src={member.image} alt={member.name} />
                          <AvatarFallback className="text-[8px]">
                            {member.name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[100px]">{member.name}</span>
                        {isSelected && <Check className="size-3 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 gap-2 flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-9 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !formData.title.trim() || !formData.listId}
                className="h-9 px-4 text-xs font-medium"
              >
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
