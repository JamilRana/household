//(app)/tasks/[listId]/page.tsx
"use client";

import { TaskCard } from "@/components/tasks/task-card";
import { TaskEmptyState } from "@/components/tasks/task-empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import {
  LayoutGrid,
  List as ListIcon,
  Users,
  Lock,
  Search,
  Menu,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { Suspense, useState, useEffect, use } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTaskListById, getTaskLists } from "@/lib/actions/tasks";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { ListFormDialog } from "@/components/tasks/list-form-dialog";

export default function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="p-6 sm:p-8 space-y-4 animate-pulse max-w-7xl mx-auto">
          <div className="h-10 w-1/4 bg-muted rounded-md" />
          <div className="h-40 w-full bg-muted/60 rounded-lg" />
        </div>
      }
    >
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
    try {
      const [data, allLists] = await Promise.all([
        getTaskListById(listId),
        getTaskLists(),
      ]);
      setList(data);
      setLists(allLists);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [listId]);

  const onRefresh = () => load();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xs text-muted-foreground animate-pulse">Loading list...</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-12 text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">List not found</h2>
        <p className="text-xs text-muted-foreground">The list might have been deleted or moved.</p>
      </div>
    );
  }

  const allTasks = list.tasks || [];
  const pendingTasks = allTasks.filter(
    (t: any) =>
      t.status !== "COMPLETED" &&
      (!search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()))
  );
  const completedTasks = allTasks.filter(
    (t: any) =>
      t.status === "COMPLETED" &&
      (!search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <TaskSidebar lists={lists} onRefresh={onRefresh} />
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header with Drawer Trigger */}
        <div className="lg:hidden px-4 py-3 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                list.groupId ? "bg-indigo-500" : "bg-sky-500"
              )}
            />
            <h1 className="font-semibold text-sm truncate">{list.name}</h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <TaskFormModal
              lists={lists}
              defaultListId={listId}
              onRefresh={onRefresh}
              trigger={
                <Button size="sm" className="h-8 gap-1 px-2.5 text-xs">
                  <Plus className="size-3.5" />
                  Task
                </Button>
              }
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-8" aria-label="Open task navigation">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r border-border">
                <SheetTitle className="sr-only">Task Navigation</SheetTitle>
                <TaskSidebar lists={lists} onRefresh={onRefresh} isMobile />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Galley Page Header */}
          <div className="page-head-galley">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                    list.groupId
                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                      : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                  )}
                >
                  {list.groupId ? <Users className="size-3" /> : <Lock className="size-3" />}
                  {list.groupId ? "Group Space" : "Personal Space"}
                </span>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                  {list.name}
                </h1>

                {/* Edit and Share actions neatly aligned */}
                <div className="inline-flex items-center gap-1">
                  <ListFormDialog
                    list={list}
                    onRefresh={onRefresh}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded text-muted-foreground hover:text-foreground"
                        aria-label="Edit list details"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    }
                  />
                  <ShareModal
                    resourceType="TASK_LIST"
                    resourceId={listId}
                    resourceName={list.name}
                  />
                </div>
              </div>

              {list.description && (
                <p className="text-xs text-muted-foreground leading-normal max-w-xl">
                  {list.description}
                </p>
              )}
            </div>

            {/* Header Right: Quick metrics & Add Task Button */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-rule bg-card/60 text-xs text-muted-foreground shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">{allTasks.length}</span>
                  <span>Total</span>
                </div>
                <div className="w-px h-3.5 bg-rule" />
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="font-bold">{completedTasks.length}</span>
                  <span>Done</span>
                </div>
              </div>

              <TaskFormModal
                lists={lists}
                defaultListId={listId}
                onRefresh={onRefresh}
                trigger={
                  <button type="button" className="btn-heat">
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Add Task</span>
                  </button>
                }
              />
            </div>
          </div>

          {/* List Toolbar & View Tabs */}
          <Tabs defaultValue="list" className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tasks in this list..."
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

              {/* View Switcher Tabs */}
              <TabsList className="h-8 p-0.5 rounded-lg border border-border bg-muted/40">
                <TabsTrigger
                  value="list"
                  className="h-7 px-3 text-xs rounded-md font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                >
                  <ListIcon className="size-3.5 mr-1.5" />
                  List
                </TabsTrigger>
                <TabsTrigger
                  value="board"
                  className="h-7 px-3 text-xs rounded-md font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                >
                  <LayoutGrid className="size-3.5 mr-1.5" />
                  Board
                </TabsTrigger>
              </TabsList>
            </div>

            {/* List View */}
            <TabsContent value="list" className="space-y-6 pt-1">
              {/* Active Tasks */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Active Tasks ({pendingTasks.length})
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                {pendingTasks.length > 0 ? (
                  <div className="space-y-2">
                    {pendingTasks.map((task: any) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        lists={lists}
                        onRefresh={onRefresh}
                      />
                    ))}
                  </div>
                ) : (
                  <TaskEmptyState
                    variant={search ? "filtered" : "list"}
                    lists={lists}
                    listId={listId}
                    onClearFilters={() => setSearch("")}
                    onRefresh={onRefresh}
                  />
                )}
              </div>

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      Completed ({completedTasks.length})
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>

                  <div className="space-y-2">
                    {completedTasks.map((task: any) => (
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
            </TabsContent>

            {/* Kanban Board View */}
            <TabsContent value="board" className="pt-2">
              <div className="min-h-[500px] overflow-x-auto pb-4">
                <KanbanBoard initialTasks={list.tasks} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
