//components/tasks/task-card.tsx
"use client";

import { useConfirm } from "@/components/confirm-provider";
import { useState } from "react";
import {
  Check,
  Clock,
  MoreVertical,
  Flag,
  Repeat,
  Trash2,
  Edit2,
  Calendar,
  Hash,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus, Priority } from "@prisma/client";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { format, isBefore, startOfToday, isToday, isTomorrow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskFormModal } from "./task-form-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskCardProps {
  task: any;
  lists?: any[];
  onRefresh?: () => void;
}

const priorityStyles: Record<
  Priority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  LOW: {
    label: "Low",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground/60",
  },
  MEDIUM: {
    label: "Medium",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    dotClass: "bg-primary",
  },
  HIGH: {
    label: "High",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
  },
  URGENT: {
    label: "Urgent",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-500",
  },
};

function formatDueDate(date: any) {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM d");
  } catch {
    return null;
  }
}

export function TaskCard({ task, lists = [], onRefresh }: TaskCardProps) {
  const confirm = useConfirm();
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus>(task.status);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isCompleted = optimisticStatus === "COMPLETED";
  const isOverdue =
    task.dueDate && isBefore(new Date(task.dueDate), startOfToday()) && !isCompleted;

  const handleToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStatus: TaskStatus = isCompleted ? "NOT_STARTED" : "COMPLETED";
    setOptimisticStatus(newStatus);

    try {
      await updateTaskStatus(task.id, newStatus);
      onRefresh?.();
    } catch (err) {
      setOptimisticStatus(task.status);
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      await confirm({
        title: "Delete this task?",
        description: "It will be permanently removed for everyone.",
        confirmLabel: "Delete task",
        destructive: true,
      })
    ) {
      await deleteTask(task.id);
      onRefresh?.();
    }
  };

  const priorityMeta = priorityStyles[task.priority as Priority] || priorityStyles.MEDIUM;
  const formattedDate = formatDueDate(task.dueDate);

  return (
    <>
      <div
        className={cn(
          "group relative flex items-start gap-3 p-3.5 sm:p-4 rounded-lg border bg-card transition-all",
          isCompleted
            ? "border-border/60 bg-card/60 opacity-75"
            : isOverdue
            ? "border-rose-300/70 dark:border-rose-900/60 hover:border-rose-400"
            : "border-border hover:border-border/90 hover:shadow-xs"
        )}
      >
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isUpdating}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          className={cn(
            "mt-0.5 size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer",
            isCompleted
              ? "bg-primary border-primary text-primary-foreground"
              : isOverdue
              ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-500"
              : "border-input hover:border-primary/60 hover:bg-muted/40"
          )}
        >
          {isCompleted && <Check className="size-3.5 stroke-[2.5]" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "text-sm font-medium leading-tight truncate transition-colors",
                isCompleted
                  ? "line-through text-muted-foreground"
                  : "text-foreground font-medium"
              )}
            >
              {task.title}
            </h4>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 leading-normal">
              {task.description}
            </p>
          )}

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {/* Priority Indicator */}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                priorityMeta.badgeClass
              )}
            >
              <span className={cn("size-1.5 rounded-full", priorityMeta.dotClass)} />
              {priorityMeta.label}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border",
                  isCompleted
                    ? "bg-muted text-muted-foreground border-border"
                    : isOverdue
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    : isToday(new Date(task.dueDate))
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    : "bg-muted/80 text-muted-foreground border-border"
                )}
              >
                {isOverdue && !isCompleted ? (
                  <Clock className="size-3 shrink-0 text-rose-500" />
                ) : (
                  <Calendar className="size-3 shrink-0" />
                )}
                {formattedDate}
                {isOverdue && !isCompleted && " (Overdue)"}
              </span>
            )}

            {/* Recurrence */}
            {task.recurrence && task.recurrence !== "NONE" && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border"
                title={`Repeats ${task.recurrence.toLowerCase()}`}
              >
                <Repeat className="size-3" />
                <span className="capitalize">{task.recurrence.toLowerCase()}</span>
              </span>
            )}

            {/* Target List */}
            {task.list?.name && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground bg-muted/60 border border-border/60">
                <Hash className="size-3 text-muted-foreground/70" />
                <span className="truncate max-w-[120px]">{task.list.name}</span>
              </span>
            )}

            {/* Assignee Avatars */}
            {task.assignments?.length > 0 && (
              <div className="flex -space-x-1.5 items-center ml-1">
                {task.assignments.map((a: any) => (
                  <Avatar
                    key={a.userId}
                    className="size-5 border border-background ring-1 ring-border/50"
                    title={a.user?.name || "Assignee"}
                  >
                    <AvatarImage src={a.user?.image} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                      {a.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contextual Actions on Hover / Touch */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Quick Edit (visible on hover) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditModalOpen(true)}
            className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hidden sm:inline-flex"
            aria-label="Edit task"
          >
            <Edit2 className="size-3.5" />
          </Button>

          {/* Quick Delete (visible on hover) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hidden sm:inline-flex"
            aria-label="Delete task"
          >
            <Trash2 className="size-3.5" />
          </Button>

          {/* Dropdown Menu (for full options and mobile) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground rounded sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                aria-label="Task options"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setEditModalOpen(true)}
                className="text-xs"
              >
                <Edit2 className="size-3.5 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleToggle}
                className="text-xs"
              >
                <CheckCircle2 className="size-3.5 mr-2" />
                {isCompleted ? "Mark Pending" : "Mark Done"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Controlled Edit Modal */}
      {editModalOpen && (
        <TaskFormModal
          task={task}
          lists={lists}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
