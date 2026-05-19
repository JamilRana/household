"use client";

import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination";
import { Search, Calendar, Target, CalendarClock, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";
import { format, isBefore, isAfter, startOfToday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskListWithFiltersProps {
  initialTasks: any[];
  lists: any[];
}

const getTaskMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  options.push({ label: "All Tasks", value: "ALL" });
  options.push({ label: "Due This Month", value: "THIS_MONTH" });
  options.push({ label: "Due Next Month", value: "NEXT_MONTH" });

  for (let i = -2; i < 10; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const label = `Due in ${format(d, "MMMM yyyy")}`;
    const value = format(d, "yyyy-MM");
    
    if (i !== 0 && i !== 1) {
      options.push({ label, value });
    }
  }
  return options;
};

export function TaskListWithFilters({ initialTasks, lists }: TaskListWithFiltersProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, monthFilter, priorityFilter, tasks]);

  const monthOptions = getTaskMonthOptions();
  const selectedMonthLabel = monthOptions.find(opt => opt.value === monthFilter)?.label || "All Tasks";

  const today = startOfToday();

  const filteredTasks = tasks.filter(task => {
    // Search match
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    // Priority filter
    if (priorityFilter && task.priority !== priorityFilter) return false;

    // Due Date/Month filter
    if (monthFilter !== "ALL") {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const todayDate = new Date();
      
      if (monthFilter === "THIS_MONTH") {
        return dueDate.getFullYear() === todayDate.getFullYear() && dueDate.getMonth() === todayDate.getMonth();
      }
      if (monthFilter === "NEXT_MONTH") {
        const nextMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
        return dueDate.getFullYear() === nextMonth.getFullYear() && dueDate.getMonth() === nextMonth.getMonth();
      }
      
      const [year, month] = monthFilter.split("-").map(Number);
      return dueDate.getFullYear() === year && (dueDate.getMonth() + 1) === month;
    }

    return true;
  });

  const overdueTasks = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
  const upcomingTasks = filteredTasks.filter(t => !t.dueDate || new Date(t.dueDate) >= today);

  const totalPages = Math.ceil(upcomingTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUpcomingTasks = upcomingTasks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Filtering toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
        <div className="flex flex-wrap gap-2">
          {/* Priority filter pills */}
          <div 
            onClick={() => setPriorityFilter(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer border",
              !priorityFilter 
                ? "bg-blue-600 border-blue-600 text-white" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-500"
            )}
          >
            All Priorities
          </div>
          {["HIGH", "URGENT", "MEDIUM", "LOW"].map((p) => (
            <div 
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer border",
                priorityFilter === p 
                  ? "bg-blue-600 border-blue-600 text-white" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-500"
              )}
            >
              {p}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 lg:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Quick search..." 
              className="pl-9 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-sm focus-visible:ring-blue-500 font-bold text-xs" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Month selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 px-5 rounded-2xl border-slate-100 bg-white dark:bg-slate-900 shadow-sm font-black uppercase tracking-widest text-[10px] gap-2 shrink-0">
                <Calendar className="h-4 w-4" />
                {selectedMonthLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl p-2 max-h-[300px] overflow-y-auto min-w-[200px]">
              {monthOptions.map(opt => (
                <DropdownMenuItem key={opt.value} onClick={() => setMonthFilter(opt.value)} className="rounded-xl font-bold">
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task Sections */}
      <div className="grid gap-12">
        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 px-2">
              <div className="h-px flex-1 bg-rose-100 dark:bg-rose-900/30" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-rose-500 flex items-center gap-3">
                <CalendarClock className="h-4 w-4" />
                Urgent Attention ({overdueTasks.length})
              </h2>
              <div className="h-px flex-1 bg-rose-100 dark:bg-rose-900/30" />
            </div>
            <div className="grid gap-4">
              {overdueTasks.map((task) => (
                <TaskCard key={task.id} task={task} lists={lists} />
              ))}
            </div>
          </div>
        )}

        {/* Active */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 px-2">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
              <Target className="h-4 w-4" />
              Next Up ({upcomingTasks.length})
            </h2>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="space-y-6">
            <div className="grid gap-4 animate-in fade-in duration-300">
              {paginatedUpcomingTasks.length > 0 ? (
                paginatedUpcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} lists={lists} />
                ))
              ) : (
                <div className="text-center py-32 bg-white/50 dark:bg-slate-900/30 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ListTodo className="h-12 w-12 text-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-900 dark:text-slate-100 text-2xl font-black">All Clear</p>
                    <p className="text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">No active tasks match your selected filters.</p>
                  </div>
                </div>
              )}
            </div>
            {upcomingTasks.length > 0 && (
              <div className="bg-slate-50/50 dark:bg-slate-900/10 p-6 rounded-3xl">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
