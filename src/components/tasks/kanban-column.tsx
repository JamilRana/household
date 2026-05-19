//components/tasks/kanban-column.tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTaskCard } from "./sortable-task-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
}

export function KanbanColumn({ id, title, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: "Column",
    },
  });

  return (
    <div className="flex flex-col w-[350px] min-w-[350px] bg-slate-100/30 dark:bg-slate-900/30 rounded-[2.5rem] p-5 space-y-6 border border-slate-100/50 dark:border-slate-800/50">
      <div className="flex items-center justify-between px-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
          {title}
        </h3>
        <span className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[10px] px-2.5 py-1 rounded-full font-black shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-4 min-h-[400px] transition-all duration-300 rounded-[2rem] p-1",
          isOver && "bg-blue-500/5 ring-2 ring-blue-500/20 ring-inset"
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] opacity-30">
            <p className="text-xs font-bold uppercase tracking-widest">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
