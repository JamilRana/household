//components/tasks/task-card.tsx
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, MoreVertical, Flag, Repeat, Trash2, Edit2, Calendar, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const priorityColors = {
  LOW: "text-slate-400 bg-slate-100 dark:bg-slate-800",
  MEDIUM: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  HIGH: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  URGENT: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
};

function formatDueDate(date: any) {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM d, yyyy");
  } catch (e) {
    return null;
  }
}

export function TaskCard({ task, lists = [], onRefresh }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus>(task.status);
  
  const isCompleted = optimisticStatus === "COMPLETED";
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfToday()) && !isCompleted;

  const handleToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStatus = isCompleted ? "NOT_STARTED" : "COMPLETED";
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
    if (confirm("Delete this task?")) {
      await deleteTask(task.id);
      onRefresh?.();
    }
  };

  return (
    <Card className={cn(
      "group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/80 backdrop-blur-sm w-full",
      isOverdue && "border-rose-200 dark:border-rose-900/50 ring-1 ring-rose-500/20 shadow-rose-500/5"
    )}>
      <CardContent className="p-4 md:p-6 flex items-start gap-3 md:gap-5">
        <button 
          onClick={handleToggle}
          disabled={isUpdating}
          className={cn(
            "mt-1.5 shrink-0 transition-all duration-300",
            isCompleted 
              ? "opacity-100" 
              : "hover:scale-110 active:scale-95"
          )}
        >
          {isCompleted ? (
            <div className="relative size-6 md:size-7">
              <div className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20" />
              <Check className="size-4 md:size-5 text-white absolute inset-0 m-auto" />
            </div>
          ) : (
            <div className={cn(
              "size-6 md:size-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              isOverdue 
                ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:border-rose-500 hover:bg-rose-100" 
                : "border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            )}>
              {isOverdue && <Clock className="size-3.5 text-rose-500" />}
            </div>
          )}
        </button>
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "font-black text-base md:text-lg tracking-tight transition-all duration-300 truncate",
                isCompleted ? "text-slate-400 line-through decoration-2" : "text-slate-900 dark:text-slate-100"
              )}>
                {task.title}
              </h3>
              {task.recurrence && task.recurrence !== "NONE" && (
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-md">
                  <Repeat className="h-3 w-3 text-blue-600" />
                </div>
              )}
            </div>
            {task.description && (
              <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 italic">{task.description}</p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-1">
            {task.dueDate && !isCompleted && (
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors",
                isOverdue 
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              )}>
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
                {task.dueTime && (
                  <span className="opacity-80 ml-0.5">
                    {format(new Date(task.dueTime), "h:mm a")}
                  </span>
                )}
              </div>
            )}

            {task.dueDate && isCompleted && (
              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Completed {formatDueDate(task.dueDate)}
              </div>
            )}

            {!task.dueDate && (
              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500">
                <Calendar className="h-3 w-3" />
                No Due Date
              </div>
            )}
            
            <div className={cn("flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full", priorityColors[task.priority as Priority])}>
              <Flag className={cn("h-3 w-3", (task.priority === "URGENT" || task.priority === "HIGH") && "fill-current")} />
              {task.priority}
            </div>

            {task.list?.name && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-50 dark:bg-slate-900/30 rounded-full">
                <Hash className="h-3 w-3" />
                {task.list.name}
              </div>
            )}

            {task.assignments?.length > 0 && (
              <div className="flex -space-x-1.5 md:-space-x-2">
                {task.assignments.map((a: any) => (
                  <Avatar key={a.userId} className="size-6 md:size-7 border-2 border-white dark:border-slate-900 shadow-sm" title={a.user?.name}>
                    <AvatarImage src={a.user?.image} />
                    <AvatarFallback className="text-[6px] md:text-[8px] bg-blue-100 text-blue-600 font-black">{a.user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <MoreVertical className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl border-none">
              <TaskFormModal 
                task={task} 
                lists={lists} 
                onRefresh={onRefresh} 
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="rounded-xl px-4 py-2.5 font-bold text-sm cursor-pointer">
                    <Edit2 className="h-4 w-4 mr-3" />
                    Edit Task
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="rounded-xl px-4 py-2.5 font-bold text-sm cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function Hash({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}