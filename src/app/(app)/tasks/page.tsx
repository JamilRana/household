//(app)/tasks/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListTodo, Plus, Menu } from "lucide-react";
import { getTaskLists } from "@/lib/actions/tasks";
import { getActiveGroupId } from "@/lib/actions/user";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { ListFormDialog } from "@/components/tasks/list-form-dialog";
import { TaskListWithFilters } from "@/components/tasks/TaskListWithFilters";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const groupId = await getActiveGroupId(session.user.id);
  const lists = await getTaskLists(groupId);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { createdBy: session.user.id },
        { assignments: { some: { userId: session.user.id } } },
        { list: { groupId: groupId || undefined } },
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

  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <TaskSidebar lists={lists} />
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-slate-950">
          <h2 className="font-black tracking-tighter">Tasks Inbox</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <TaskSidebar lists={lists} isMobile />
            </SheetContent>
          </Sheet>
        </div>

        <div className="p-4 md:p-12 space-y-8 md:space-y-12">
          <div className="max-w-5xl mx-auto space-y-12">
            {/* Header Section */}
            <div className="relative p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="absolute top-0 right-0 h-64 w-64 bg-blue-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 h-48 w-48 bg-indigo-500/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="bg-blue-600 size-14 md:size-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 rotate-3 shrink-0">
                    <ListTodo className="h-7 w-7 md:h-10 md:w-10" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-100">Inbox</h1>
                    <p className="text-sm md:text-lg text-slate-400 font-bold mt-1">Global view of all tasks</p>
                  </div>
                </div>
                <TaskFormModal 
                  lists={lists} 
                  trigger={
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 font-black rounded-2xl h-14 px-8 transition-all active:scale-95 text-white">
                      <Plus className="mr-2 h-5 w-5" /> Add New Task
                    </Button>
                  }
                />
                <ListFormDialog 
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                      <Plus className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Pending</p>
                  <p className="text-3xl font-black">{tasks.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Overdue</p>
                  <p className="text-3xl font-black text-rose-500">{overdueTasks.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">High Priority</p>
                  <p className="text-3xl font-black text-blue-500">{tasks.filter(t => t.priority === "URGENT" || t.priority === "HIGH").length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Lists</p>
                  <p className="text-3xl font-black text-emerald-500">{lists.length}</p>
                </div>
              </div>
            </div>

            {/* Task Sections with filters */}
            <TaskListWithFilters initialTasks={tasks} lists={lists} />
          </div>
        </div>
      </div>
    </div>
  );
}
