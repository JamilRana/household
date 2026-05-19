//(app)/tasks/[listId]/page.tsx
"use client";

import { TaskCard } from "@/components/tasks/task-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { LayoutGrid, List, Users, Lock, ChevronRight, Search, Filter, Menu, Plus } from "lucide-react";
import { Suspense, useState, useEffect, use } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTaskListById, getTaskLists } from "@/lib/actions/tasks";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { ListFormDialog } from "@/components/tasks/list-form-dialog";

export default function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <Suspense fallback={
      <div className="p-12 space-y-8 animate-pulse">
        <div className="h-20 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
        <div className="h-64 w-full bg-slate-50 dark:bg-slate-900 rounded-[3rem]" />
      </div>
    }>
      <ListContent params={params} />
    </Suspense>
  );
}

function ListContent({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params);
  const [list, setList] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const [data, allLists] = await Promise.all([
      getTaskListById(listId),
      getTaskLists()
    ]);
    setList(data);
    setLists(allLists);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [listId]);

  const onRefresh = () => load();

  if (isLoading) return null;
  if (!list) return <div className="p-20 text-center font-black text-slate-400 italic">List not found</div>;

  const pendingTasks = list.tasks.filter((t: any) => t.status !== "COMPLETED" && t.title.toLowerCase().includes(search.toLowerCase()));
  const completedTasks = list.tasks.filter((t: any) => t.status === "COMPLETED" && t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <TaskSidebar lists={lists} onRefresh={onRefresh} />
      </aside>

      <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-950/50">
        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-slate-950">
          <h2 className="font-black tracking-tighter">{list.name}</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <TaskSidebar lists={lists} onRefresh={onRefresh} isMobile />
              <ListFormDialog 
  onRefresh={onRefresh}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Header Section */}
        <div className="relative p-6 md:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-blue-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] bg-indigo-500/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />

          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                     "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                     list.groupId ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                  )}>
                    {list.groupId ? <Users className="size-3" /> : <Lock className="size-3" />}
                    {list.groupId ? "Group Space" : "Personal Space"}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-100">{list.name}</h1>
                  <ListFormDialog 
                    list={list}
                    onRefresh={onRefresh}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="text-lg">✏️</span>
                      </Button>
                    }
                  />
                  <ShareModal 
                    resourceType="TASK_LIST" 
                    resourceId={listId} 
                    resourceName={list.name} 
                  />
                </div>
                {list.description && (
                  <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                    {list.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3 md:pb-2">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex items-center gap-4 px-4 md:px-6 h-12 md:h-14">
                    <div className="text-center">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                      <p className="text-base md:text-lg font-black leading-none">{list.tasks.length}</p>
                    </div>
                    <div className="w-px h-6 md:h-8 bg-slate-100 dark:bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Done</p>
                      <p className="text-base md:text-lg font-black leading-none">{completedTasks.length}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  placeholder="Search tasks..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 pl-12 rounded-2xl border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none font-bold focus-visible:ring-blue-500/20"
                />
              </div>
              <div className="w-full md:w-auto">
                <TaskFormModal 
  lists={lists} 
  onRefresh={onRefresh} 
                  trigger={
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 font-black rounded-2xl h-14 px-8 transition-all active:scale-95 text-white">
                      <Plus className="mr-2 h-5 w-5" /> Add New Task
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
          <Tabs defaultValue="list" className="w-full">
            <div className="flex items-center justify-between mb-6 md:mb-8 overflow-x-auto pb-2 md:pb-0">
              <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 w-full md:w-auto">
                <TabsTrigger value="list" className="flex-1 md:flex-none rounded-xl px-4 md:px-6 py-2 md:py-2.5 font-black text-[10px] md:text-xs uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="board" className="flex-1 md:flex-none rounded-xl px-4 md:px-6 py-2 md:py-2.5 font-black text-[10px] md:text-xs uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Board
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="space-y-12">
              {/* Active Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                    <span className="size-2 bg-blue-500 rounded-full animate-pulse" />
                    Active Tasks ({pendingTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {pendingTasks.map((task: any) => (
                    <TaskCard key={task.id} task={task} lists={lists} onRefresh={onRefresh} />
                  ))}
                  {pendingTasks.length === 0 && (
                    <div className="text-center py-20 bg-white/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <p className="text-slate-400 font-black italic">No active tasks found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Section */}
              {completedTasks.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                      <span className="size-2 bg-emerald-500 rounded-full" />
                      Completed ({completedTasks.length})
                    </h2>
                  </div>
                  <div className="grid gap-4 opacity-60 hover:opacity-100 transition-opacity duration-500">
                    {completedTasks.map((task: any) => (
                      <TaskCard key={task.id} task={task} lists={lists} onRefresh={onRefresh} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="board" className="min-h-[600px] -mx-8 px-8 overflow-x-auto">
              <KanbanBoard initialTasks={list.tasks} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
