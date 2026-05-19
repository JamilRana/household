//components/tasks/task-sidebar.tsx
"use client";

import { Plus, ListTodo, Hash, ChevronRight, User, Users, MoreVertical, Trash2, Edit2 } from "lucide-react";
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
  const pathname = usePathname();

  const personalLists = lists.filter(l => !l.groupId);
  const groupLists = lists.filter(l => l.groupId);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this list and all its tasks?")) {
      await deleteTaskList(id);
      onRefresh?.();
    }
  };

  const ListItem = ({ list }: { list: any }) => {
    const isActive = pathname === `/tasks/${list.id}`;
    return (
      <div className="group relative flex items-center">
        <Link href={`/tasks/${list.id}`} className="flex-1">
          <div className={cn(
            "flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm transition-all duration-300",
            isActive 
              ? "bg-white dark:bg-slate-800 shadow-lg shadow-blue-500/10 text-blue-600 font-bold border border-blue-100/50 dark:border-blue-900/30" 
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-1.5 rounded-full",
                list.groupId ? "bg-indigo-400" : "bg-blue-400"
              )} />
              <span className="truncate max-w-[140px]">{list.name}</span>
            </div>
            {list._count?.tasks > 0 && (
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-black",
                isActive ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              )}>
                {list._count.tasks}
              </span>
            )}
          </div>
        </Link>
        <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <ListFormDialog 
                list={list} 
                onRefresh={onRefresh} 
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="rounded-lg">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit List
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem onClick={() => handleDelete(list.id)} className="text-rose-600 focus:text-rose-600 rounded-lg">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "w-72 border-r bg-slate-50/30 dark:bg-slate-900/30 flex flex-col p-6 space-y-8 backdrop-blur-xl shrink-0 transition-all",
      isMobile ? "h-full" : "h-[calc(100vh-80px)]"
    )}>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation</h2>
        </div>
        <nav className="space-y-2">
          <Link href="/tasks">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-300",
              pathname === "/tasks" 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-500/25 scale-[1.02]" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            )}>
              <ListTodo className="h-5 w-5" />
              Global View
            </div>
          </Link>
        </nav>
      </div>

      {/* Personal Lists */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <User className="h-3 w-3" /> Personal
          </h2>
          <ListFormDialog 
            onRefresh={onRefresh} 
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
        <div className="space-y-1">
          {personalLists.length > 0 ? (
            personalLists.map((list) => <ListItem key={list.id} list={list} />)
          ) : (
            <p className="px-3 text-[11px] font-bold text-slate-400 italic">No personal lists</p>
          )}
        </div>
      </div>

      {/* Group Lists */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Users className="h-3 w-3" /> Group
          </h2>
          <ListFormDialog 
            onRefresh={onRefresh} 
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
        <div className="space-y-1">
          {groupLists.length > 0 ? (
            groupLists.map((list) => <ListItem key={list.id} list={list} />)
          ) : (
            <p className="px-3 text-[11px] font-bold text-slate-400 italic">No shared lists</p>
          )}
        </div>
      </div>
    </div>
  );
}
