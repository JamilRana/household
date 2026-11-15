"use client";

import { CheckCircle2, Inbox, Calendar, Search, FilterX, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormModal } from "./task-form-modal";

export type EmptyStateVariant = "inbox" | "today" | "upcoming" | "filtered" | "completed" | "list";

interface TaskEmptyStateProps {
  variant?: EmptyStateVariant;
  lists?: any[];
  listId?: string;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  customTitle?: string;
  customDescription?: string;
}

export function TaskEmptyState({
  variant = "inbox",
  lists = [],
  listId,
  onClearFilters,
  onRefresh,
  customTitle,
  customDescription,
}: TaskEmptyStateProps) {
  const configs = {
    inbox: {
      icon: Inbox,
      title: "All caught up in Inbox",
      description: "No pending tasks. Take a breath or capture something new to do.",
      actionText: "Add Task",
    },
    today: {
      icon: CheckCircle2,
      title: "No tasks due today",
      description: "You have no scheduled tasks for today. Plan ahead or take on an inbox item.",
      actionText: "Add Task for Today",
    },
    upcoming: {
      icon: Calendar,
      title: "No upcoming tasks",
      description: "No tasks scheduled for future dates. Keep your commitments organized by setting due dates.",
      actionText: "Schedule Task",
    },
    filtered: {
      icon: FilterX,
      title: "No matching tasks",
      description: "No tasks match your current filter and search query.",
      actionText: "Reset Filters",
    },
    completed: {
      icon: CheckCircle2,
      title: "No completed tasks",
      description: "Tasks you complete will be neatly logged here.",
      actionText: undefined,
    },
    list: {
      icon: Inbox,
      title: "This list is empty",
      description: "Add your first task to start organizing this workspace.",
      actionText: "Add Task to List",
    },
  };

  const current = configs[variant] || configs.inbox;
  const Icon = current.icon;
  const title = customTitle || current.title;
  const description = customDescription || current.description;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-border/80 bg-card/60 rounded-xl max-w-md mx-auto my-6 animate-in fade-in-50 duration-200">
      <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs leading-normal">{description}</p>
      
      <div className="mt-4 pt-1">
        {variant === "filtered" ? (
          onClearFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="gap-1.5 text-xs font-medium h-8"
            >
              <RotateCcw className="size-3.5" />
              Reset Filters
            </Button>
          )
        ) : current.actionText && lists.length > 0 ? (
          <TaskFormModal
            lists={lists}
            defaultListId={listId}
            onRefresh={onRefresh}
            trigger={
              <Button size="sm" className="gap-1.5 text-xs font-medium h-8">
                <Plus className="size-3.5" />
                {current.actionText}
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
