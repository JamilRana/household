"use client";

import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  Search,
  Calendar,
  Plus,
  X,
  Clock,
  ListTodo,
  CheckCircle2,
  CalendarDays,
  Flag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { TaskEmptyState } from "./task-empty-state";
import { cn } from "@/lib/utils";
import { format, startOfToday, isToday, isBefore } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { Priority } from "@prisma/client";

interface TaskListWithFiltersProps {
  initialTasks: any[];
  lists: any[];
  onRefresh?: () => void;
}

const getTaskMonthOptions = () => {
  const options = [];
  const currentDate = new Date();

  options.push({ label: "All Dates", value: "ALL" });
  options.push({ label: "Due Today", value: "TODAY" });
  options.push({ label: "Due This Month", value: "THIS_MONTH" });
  options.push({ label: "Due Next Month", value: "NEXT_MONTH" });

  for (let i = -1; i < 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const label = format(d, "MMMM yyyy");
    const value = format(d, "yyyy-MM");

    if (i !== 0 && i !== 1) {
      options.push({ label, value });
    }
  }
  return options;
};

export function TaskListWithFilters({
  initialTasks,
  lists,
  onRefresh,
}: TaskListWithFiltersProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<"active" | "all" | "completed">("active");

  // Inline Quick-Add State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("MEDIUM");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, priorityFilter, statusTab]);

  const dateOptions = getTaskMonthOptions();
  const selectedDateLabel =
    dateOptions.find((opt) => opt.value === dateFilter)?.label || "All Dates";

  const today = startOfToday();

  // Filter pipeline
  const filteredTasks = tasks.filter((task) => {
    // Status Filter
    if (statusTab === "active" && task.status === "COMPLETED") return false;
    if (statusTab === "completed" && task.status !== "COMPLETED") return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches =
        task.title?.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q) ||
        task.list?.name?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Priority filter
    if (priorityFilter && task.priority !== priorityFilter) return false;

    // Due Date filter
    if (dateFilter !== "ALL") {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);

      if (dateFilter === "TODAY") {
        return isToday(dueDate);
      }
      if (dateFilter === "THIS_MONTH") {
        const now = new Date();
        return (
          dueDate.getFullYear() === now.getFullYear() &&
          dueDate.getMonth() === now.getMonth()
        );
      }
      if (dateFilter === "NEXT_MONTH") {
        const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return (
          dueDate.getFullYear() === next.getFullYear() &&
          dueDate.getMonth() === next.getMonth()
        );
      }

      const [year, month] = dateFilter.split("-").map(Number);
      return (
        dueDate.getFullYear() === year && dueDate.getMonth() + 1 === month
      );
    }

    return true;
  });

  const overdueTasks = filteredTasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && isBefore(new Date(t.dueDate), today)
  );

  const activeNonOverdue = filteredTasks.filter(
    (t) => t.status !== "COMPLETED" && (!t.dueDate || !isBefore(new Date(t.dueDate), today))
  );

  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED");

  const totalPages = Math.ceil(activeNonOverdue.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActiveTasks = activeNonOverdue.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const isFiltered = Boolean(search || priorityFilter || dateFilter !== "ALL");

  const handleResetFilters = () => {
    setSearch("");
    setPriorityFilter(null);
    setDateFilter("ALL");
    setStatusTab("active");
  };

  // Inline Quick Add Handler
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || lists.length === 0) return;

    setIsSubmittingQuick(true);
    try {
      const created = await createTask({
        title,
        listId: lists[0].id,
        priority: quickPriority,
      });
      toast.success("Task added");
      setQuickTitle("");
      if (created) {
        setTasks((prev) => [created, ...prev]);
      }
      onRefresh?.();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Inline Quick Add Task Box */}
      {lists.length > 0 && statusTab !== "completed" && (
        <form
          onSubmit={handleQuickAdd}
          className="flex items-center gap-2 p-1.5 pl-3 border border-border/80 bg-card rounded-lg focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-2xs"
        >
          <Plus className="size-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Quick add a task to your primary list... (Press Enter to save)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            disabled={isSubmittingQuick}
            className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-normal px-0 placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center gap-1.5 shrink-0 pr-1">
            {/* Quick Priority Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Flag className="size-3" />
                  <span className="capitalize">{quickPriority.toLowerCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28 text-xs">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setQuickPriority(p)}
                    className="capitalize text-xs"
                  >
                    {p.toLowerCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="submit"
              size="sm"
              disabled={!quickTitle.trim() || isSubmittingQuick}
              className="h-7 px-3 text-xs font-medium"
            >
              Add
            </Button>
          </div>
        </form>
      )}

      {/* Compact Filters & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Status & Priority segment */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status Segment */}
          <div className="inline-flex items-center rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => setStatusTab("active")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                statusTab === "active"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("all")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                statusTab === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("completed")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                statusTab === "completed"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Done
            </button>
          </div>

          {/* Priority filter pills */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPriorityFilter(null)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                !priorityFilter
                  ? "bg-accent text-accent-foreground border-border font-semibold"
                  : "bg-card text-muted-foreground border-border/80 hover:text-foreground"
              )}
            >
              All Priorities
            </button>
            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                  priorityFilter === p
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : "bg-card text-muted-foreground border-border/80 hover:text-foreground"
                )}
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Date selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Compact Search */}
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-md bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Date / Month Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-medium gap-1.5 shrink-0 bg-card border-border"
              >
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span className="truncate max-w-[100px]">{selectedDateLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {dateOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Reset all filters"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Task Sections */}
      <div className="space-y-6 pt-1">
        {/* Overdue Section */}
        {overdueTasks.length > 0 && statusTab !== "completed" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <Clock className="size-3.5" />
                Needs Attention ({overdueTasks.length})
              </span>
              <div className="h-px flex-1 bg-rose-200/50 dark:bg-rose-950/40" />
            </div>

            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  lists={lists}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Tasks Section */}
        {statusTab !== "completed" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ListTodo className="size-3.5" />
                Active Tasks ({activeNonOverdue.length})
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {paginatedActiveTasks.length > 0 ? (
              <div className="space-y-2">
                {paginatedActiveTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    lists={lists}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            ) : overdueTasks.length === 0 ? (
              <TaskEmptyState
                variant={
                  isFiltered
                    ? "filtered"
                    : dateFilter === "TODAY"
                    ? "today"
                    : "inbox"
                }
                lists={lists}
                onClearFilters={handleResetFilters}
                onRefresh={onRefresh}
              />
            ) : null}

            {activeNonOverdue.length > itemsPerPage && (
              <div className="pt-2 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Completed Tasks Section */}
        {(statusTab === "all" || statusTab === "completed") &&
          completedTasks.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  Completed ({completedTasks.length})
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    lists={lists}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Empty state when filtering or viewing completed and nothing exists */}
        {statusTab === "completed" && completedTasks.length === 0 && (
          <TaskEmptyState
            variant={isFiltered ? "filtered" : "completed"}
            onClearFilters={handleResetFilters}
          />
        )}
      </div>
    </div>
  );
}
