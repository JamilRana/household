//components/tasks/task-sidebar.tsx
"use client";

import { useState } from "react";
import { useConfirm } from "@/components/confirm-provider";
import { Plus, ListTodo, ChevronDown, ChevronRight, User, Users, MoreVertical, Trash2, Edit2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListFormDialog } from "./list-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTaskList } from "@/lib/actions/tasks";

interface TaskSidebarProps {
  lists: any[];
  isMobile?: boolean;
  onRefresh?: () => void;
}

export function TaskSidebar({ lists, isMobile, onRefresh }: TaskSidebarProps) {
  const confirm = useConfirm();
  const pathname = usePathname();

  const [personalOpen, setPersonalOpen] = useState(true);
  const [groupOpen, setGroupOpen] = useState(true);

  const personalLists = lists.filter((l) => !l.groupId);
  const groupLists = lists.filter((l) => l.groupId);

  const handleDelete = async (id: string, name: string) => {
    if (
      await confirm({
        title: `Delete "${name}"?`,
        description: "All the tasks in this list will be permanently deleted.",
        confirmLabel: "Delete list",
        destructive: true,
      })
    ) {
      await deleteTaskList(id);
      onRefresh?.();
    }
  };

  const ListItem = ({ list }: { list: any }) => {
    const isActive = pathname === `/tasks/${list.id}`;
    const taskCount = list._count?.tasks ?? 0;

    return (
      <div className="group relative flex items-center w-full">
        <Link
          href={`/tasks/${list.id}`}
          className={cn(
            "flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-sm transition-colors",
            isActive
              ? "bg-accent text-accent-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 pr-6">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                list.groupId ? "bg-indigo-500" : "bg-sky-500"
              )}
            />
            <span className="truncate">{list.name}</span>
          </div>

          {taskCount > 0 && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.2 rounded font-medium shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}
            >
              {taskCount}
            </span>
          )}
        </Link>

        {/* Hover / context menu */}
        <div className="absolute right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground rounded"
                aria-label={`Actions for ${list.name}`}
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <ListFormDialog
                list={list}
                onRefresh={onRefresh}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs">
                    <Edit2 className="size-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem
                onClick={() => handleDelete(list.id, list.name)}
                className="text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "w-64 border-r border-border bg-card/50 flex flex-col p-4 space-y-6 shrink-0 transition-all text-sm",
        isMobile ? "h-full" : "h-[calc(100vh-56px)] sticky top-14"
      )}
    >
      {/* Primary Views */}
      <div className="space-y-1">
        <Link
          href="/tasks"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors text-sm",
            pathname === "/tasks"
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <ListTodo className="size-4 shrink-0" />
          <span>All Tasks</span>
        </Link>
      </div>

      {/* Personal Lists (Collapsible) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setPersonalOpen(!personalOpen)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none"
            aria-expanded={personalOpen}
          >
            {personalOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            <span className="font-semibold tracking-wide uppercase text-[11px]">Personal</span>
            <span className="text-[11px] text-muted-foreground/70">({personalLists.length})</span>
          </button>

          <ListFormDialog
            onRefresh={onRefresh}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Add personal list"
              >
                <Plus className="size-3.5" />
              </Button>
            }
          />
        </div>

        {personalOpen && (
          <div className="space-y-0.5 pt-1 pl-1">
            {personalLists.length > 0 ? (
              personalLists.map((list) => <ListItem key={list.id} list={list} />)
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground/70">No personal lists yet</p>
            )}
          </div>
        )}
      </div>

      {/* Group Lists (Collapsible) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={() => setGroupOpen(!groupOpen)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer select-none"
            aria-expanded={groupOpen}
          >
            {groupOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            <span className="font-semibold tracking-wide uppercase text-[11px]">Group</span>
            <span className="text-[11px] text-muted-foreground/70">({groupLists.length})</span>
          </button>

          <ListFormDialog
            onRefresh={onRefresh}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Add group list"
              >
                <Plus className="size-3.5" />
              </Button>
            }
          />
        </div>

        {groupOpen && (
          <div className="space-y-0.5 pt-1 pl-1">
            {groupLists.length > 0 ? (
              groupLists.map((list) => <ListItem key={list.id} list={list} />)
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground/70">No group lists yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
