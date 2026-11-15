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
    <div className="flex flex-col w-[320px] min-w-[320px] bg-muted/30 rounded-xl p-3.5 space-y-3 border border-border/60">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className="bg-card text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium border border-border shadow-2xs">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 min-h-[400px] transition-colors rounded-lg p-0.5",
          isOver && "bg-primary/5 ring-1 ring-primary/30 ring-inset"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border border-dashed border-border/80 rounded-lg">
            <p className="text-xs text-muted-foreground/60">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}
