"use client";
import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Flag, Layout, Type, AlignLeft, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask, updateTask, getGroupMembersByList } from "@/lib/actions/tasks";
import type { Priority, TaskStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner"; // Install: npm install sonner

interface TaskFormModalProps {
  lists: any[];
  task?: any | null; // If provided, edit mode; else create mode
  onRefresh?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TaskFormModal({ 
  lists, task, onRefresh, open: controlledOpen, onOpenChange, trigger 
}: TaskFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Form state with smart defaults
  const [formData, setFormData] = useState({
    title: "",
    listId: lists[0]?.id || "",
    priority: "MEDIUM" as Priority,
    dueDate: "",
    description: "",
    assignedUserIds: [] as string[],
    status: "NOT_STARTED" as TaskStatus,
  });

  const [members, setMembers] = useState<any[]>([]);
  const isEditMode = !!task;

  // Initialize form data when task or modal opens
  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.title || "",
          listId: task.listId || lists[0]?.id || "",
          priority: task.priority || "MEDIUM",
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
          description: task.description || "",
          assignedUserIds: task.assignments?.map((a: any) => a.userId) || [],
          status: task.status || "NOT_STARTED",
        });
      } else {
        setFormData(prev => ({
          ...prev,
          listId: lists[0]?.id || prev.listId,
          assignedUserIds: [],
        }));
      }
      // Load members for the selected list
      if (task?.listId || lists[0]?.id) {
        getGroupMembersByList(task?.listId || lists[0].id).then(setMembers).catch(() => setMembers([]));
      }
    }
  }, [open, task, lists]);

  // Load members when list changes
  useEffect(() => {
    if (formData.listId && open) {
      getGroupMembersByList(formData.listId).then(setMembers).catch(() => setMembers([]));
    }
  }, [formData.listId, open]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter(id => id !== userId)
        : [...prev.assignedUserIds, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.success("Task updated successfully");
      } else {
        await createTask({
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        });
        toast.success("Task created successfully");
      }
      onRefresh?.();
      setOpen(false);
      // Reset form for create mode
      if (!isEditMode) {
        setFormData(prev => ({
          ...prev,
          title: "",
          description: "",
          dueDate: "",
          assignedUserIds: [],
        }));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isEditMode ? "Edit Task" : "Create New Task";
  const submitLabel = loading 
    ? (isEditMode ? "Saving..." : "Creating...") 
    : (isEditMode ? "Save Changes" : "Create Task");

  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-6 md:p-8 border-none shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight">{modalTitle}</DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            {isEditMode ? "Update task details below." : "Fill in the details to add a new task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* List Selection - Only show in create mode or if task can change lists */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Layout className="size-3" /> Target List
              </Label>
              <Select 
                value={formData.listId} 
                onValueChange={(val) => updateField('listId', val)}
                disabled={loading}
              >
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-bold focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id} className="rounded-xl font-bold py-2.5">
                      {list.groupId ? `${list.name} 👥` : list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Type className="size-3" /> Task Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              disabled={loading}
              className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-semibold text-base focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              required
            />
          </div>

          {/* Assignments */}
          {members.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users className="size-3" /> Assign Members
              </Label>
              <div className="flex flex-wrap gap-2 min-h-[48px] p-1">
                {members.map(member => {
                  const isSelected = formData.assignedUserIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      disabled={loading}
                      className={cn(
                        "flex items-center gap-2 p-1.5 pr-3 rounded-full border-2 transition-all group disabled:opacity-50",
                        isSelected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 shadow-md"
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      )}
                    >
                      <Avatar className="size-7 ring-2 ring-white dark:ring-slate-900">
                        <AvatarImage src={member.image} alt={member.name} />
                        <AvatarFallback className="text-[10px] font-black bg-slate-100">
                          {member.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-bold truncate max-w-[120px]">{member.name}</span>
                      {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <AlignLeft className="size-3" /> Details
            </Label>
            <Input
              placeholder="Add context or instructions (optional)"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              disabled={loading}
              className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-medium focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Flag className="size-3" /> Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => updateField('priority', v as Priority)}
                disabled={loading}
              >
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl">
                  <SelectItem value="LOW" className="rounded-xl font-bold text-slate-500">🟢 Low</SelectItem>
                  <SelectItem value="MEDIUM" className="rounded-xl font-bold text-blue-600">🔵 Medium</SelectItem>
                  <SelectItem value="HIGH" className="rounded-xl font-bold text-orange-600">🟠 High</SelectItem>
                  <SelectItem value="URGENT" className="rounded-xl font-bold text-rose-600">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Calendar className="size-3" /> Due Date
              </Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                disabled={loading}
                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 font-bold [color-scheme:light_dark]"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-12 px-6 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.listId}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
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