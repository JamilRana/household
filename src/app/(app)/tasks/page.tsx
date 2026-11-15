//(app)/tasks/page.tsx
import { redirect } from "next/navigation";
import { NO_GROUP } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListTodo, Plus, Menu, Clock, AlertCircle, FolderKanban } from "lucide-react";
import { getTaskLists } from "@/lib/actions/tasks";
import { getActiveGroupId } from "@/lib/actions/user";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { TaskListWithFilters } from "@/components/tasks/TaskListWithFilters";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const groupId = await getActiveGroupId(session.user.id);
  const lists = await getTaskLists(groupId);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { createdBy: session.user.id },
        { assignments: { some: { userId: session.user.id } } },
        { list: { groupId: groupId ?? NO_GROUP } },
      ],
      status: { not: "COMPLETED" },
    },
    include: {
      list: { select: { name: true } },
      assignments: { include: { user: true } },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
    ],
    take: 50,
  });

  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "URGENT" || t.priority === "HIGH"
  );

  return (
    <div className="flex h-full min-h-[calc(100vh-56px)]">
      {/* Persistent Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <TaskSidebar lists={lists} />
      </aside>

      {/* Main Workspace Area (takes available screen width) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Sub-Header & Sidebar Drawer */}
        <div className="lg:hidden px-4 py-3 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-primary" />
            <h1 className="font-semibold text-sm">Tasks</h1>
          </div>
          <div className="flex items-center gap-2">
            <TaskFormModal
              lists={lists}
              trigger={
                <Button size="sm" className="h-8 gap-1 px-2.5 text-xs">
                  <Plus className="size-3.5" />
                  New Task
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
                <TaskSidebar lists={lists} isMobile />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Galley Page Header (Desktop) */}
          <div className="hidden lg:flex items-end justify-between gap-4 pb-2 border-b border-rule">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Tasks</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                  Global Inbox
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Consolidated view of your assigned and personal household tasks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <TaskFormModal
                lists={lists}
                trigger={
                  <button type="button" className="btn-heat">
                    <Plus className="size-3.5 stroke-[2.5]" />
                    <span>Add Task</span>
                  </button>
                }
              />
            </div>
          </div>

          {/* Galley Stat Strip */}
          <div className="stat-strip-galley">
            <div>
              <span className="stat-label">PENDING</span>
              <b className="stat-val">{tasks.length}</b>
              <small className="stat-sub">Active tasks</small>
            </div>

            <div>
              <span className="stat-label">OVERDUE</span>
              <b className="stat-val">
                {overdueTasks.length > 0 ? (
                  <span className="text-destructive font-bold">{overdueTasks.length}</span>
                ) : (
                  0
                )}
              </b>
              <small className="stat-sub">Needs immediate action</small>
            </div>

            <div>
              <span className="stat-label">HIGH PRIORITY</span>
              <b className="stat-val text-amber-600 dark:text-amber-400">
                {highPriorityTasks.length}
              </b>
              <small className="stat-sub">Urgent & high tasks</small>
            </div>

            <div>
              <span className="stat-label">ACTIVE LISTS</span>
              <b className="stat-val">{lists.length}</b>
              <small className="stat-sub">Organized categories</small>
            </div>
          </div>

          {/* Main Task List & Filter Controls in Galley Card */}
          <div className="galley-card">
            <TaskListWithFilters initialTasks={tasks} lists={lists} />
          </div>
        </div>
      </div>
    </div>
  );
}
