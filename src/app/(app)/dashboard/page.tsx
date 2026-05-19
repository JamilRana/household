import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  ListTodo, 
  ShoppingCart, 
  Banknote, 
  Package, 
  ArrowRight, 
  TrendingUp, 
  Clock,
  AlertCircle,
  Plus,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/actions/user";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const groupId = await getActiveGroupId(session.user.id);

  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Fetch summary data across all modules (User + Group scoped)
  const [
    taskCount, 
    tasksNewToday,
    groceryCount, 
    groceriesNewToday,
    transactions, 
    thisMonthExpenses,
    lastMonthExpenses,
    pantryItems,
    expiringSoonCount
  ] = await Promise.all([
    prisma.task.count({ 
      where: { 
        OR: [{ createdBy: session.user.id }, { list: { groupId: groupId || undefined } }],
        status: { not: "COMPLETED" } 
      } 
    }),
    prisma.task.count({ 
      where: { 
        OR: [{ createdBy: session.user.id }, { list: { groupId: groupId || undefined } }],
        createdAt: { gte: startOfToday } 
      } 
    }),
    prisma.groceryItem.count({ 
      where: { 
        OR: [{ createdBy: session.user.id }, { list: { groupId: groupId || undefined } }],
        status: "PENDING" 
      } 
    }),
    prisma.groceryItem.count({ 
      where: { 
        OR: [{ createdBy: session.user.id }, { list: { groupId: groupId || undefined } }],
        createdAt: { gte: startOfToday } 
      } 
    }),
    prisma.transaction.findMany({ 
      where: { 
        OR: [{ userId: session.user.id }, { groupId: groupId || undefined }] 
      }, 
      orderBy: { date: "desc" }, 
      take: 5 
    }),
    prisma.transaction.aggregate({
      where: { 
        OR: [{ userId: session.user.id }, { groupId: groupId || undefined }],
        type: "EXPENSE", 
        date: { gte: startOfThisMonth } 
      },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { 
        OR: [{ userId: session.user.id }, { groupId: groupId || undefined }],
        type: "EXPENSE", 
        date: { gte: startOfLastMonth, lt: startOfThisMonth } 
      },
      _sum: { amount: true }
    }),
    prisma.pantryItem.findMany({ 
      where: { 
        OR: [{ userId: session.user.id }, { groupId: groupId || undefined }] 
      }, 
      orderBy: { expiryDate: "asc" }, 
      take: 3 
    }),
    prisma.pantryItem.count({
      where: {
        OR: [{ userId: session.user.id }, { groupId: groupId || undefined }],
        expiryDate: {
          gt: new Date(),
          lt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        }
      }
    })
  ]);

  const totalExpense = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const thisMonthTotal = Number(thisMonthExpenses._sum.amount || 0);
  const lastMonthTotal = Number(lastMonthExpenses._sum.amount || 0);
  const financeTrend = lastMonthTotal > 0 
    ? `${((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0)}% from last month`
    : "First month tracking";

  const expiringSoon = pantryItems.filter(item => {
    if (!item.expiryDate) return false;
    const diff = new Date(item.expiryDate).getTime() - new Date().getTime();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 7;
  });

  return (
    <div className="p-4 lg:p-10 space-y-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            Personal Overview
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Everything looks good. You have <span className="text-foreground font-bold">{taskCount} tasks</span> pending today.
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-background border shadow-sm self-start md:self-auto">
          <Clock className="size-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Current Date</span>
            <span className="font-bold">{format(new Date(), "MMMM do, yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Active Tasks" 
          value={taskCount} 
          icon={ListTodo} 
          color="text-blue-500" 
          bg="bg-blue-500/10" 
          href="/tasks?filter=pending"
          trend={`+${tasksNewToday} new today`}
        />
        <StatsCard 
          title="Shopping List" 
          value={groceryCount} 
          icon={ShoppingCart} 
          color="text-emerald-500" 
          bg="bg-emerald-500/10" 
          href="/groceries"
          trend={`${groceriesNewToday} added today`}
        />
        <StatsCard 
          title="Monthly Spend" 
          value={`$${thisMonthTotal.toLocaleString()}`} 
          icon={Banknote} 
          color="text-rose-500" 
          bg="bg-rose-500/10" 
          href="/finance"
          trend={financeTrend}
        />
        <StatsCard 
          title="Pantry Items" 
          value={pantryItems.length} 
          icon={Package} 
          color="text-amber-500" 
          bg="bg-amber-500/10" 
          href="/pantry"
          trend={`${expiringSoonCount} expiring soon`}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Recent Activity</h2>
            <Link href="/finance">
              <Button variant="ghost" className="text-primary font-bold group">
                View detailed reports
                <ChevronRight className="ml-1 size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-1">
                {transactions.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                        <Banknote className={cn("size-6", t.type === "INCOME" ? "text-emerald-500" : "text-rose-500")} />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{t.description || "Transaction"}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(t.date), "MMMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-black tracking-tight", t.type === "INCOME" ? "text-emerald-500" : "text-foreground")}>
                        {t.type === "INCOME" ? "+" : "-"}${Number(t.amount).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Verified</p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="py-20 text-center space-y-3">
                    <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Banknote className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium italic">No recent transactions to show.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-10">
          <div className="space-y-6">
             <h2 className="text-2xl font-extrabold tracking-tight px-2">Action Center</h2>
             
             <Card className="border-none shadow-xl bg-primary text-primary-foreground rounded-[2rem] overflow-hidden relative group">
                <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform duration-500" />
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <AlertCircle className="size-5" />
                    Quick Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  {expiringSoon.length > 0 ? (
                    expiringSoon.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white/10 border border-white/10 flex justify-between items-center hover:bg-white/20 transition-colors cursor-pointer">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs opacity-70">Expires in {Math.ceil((new Date(item.expiryDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</p>
                        </div>
                        <ChevronRight className="size-4" />
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm opacity-70 italic font-medium">Your pantry is in good shape!</p>
                    </div>
                  )}
                </CardContent>
             </Card>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-lg px-2 text-muted-foreground uppercase tracking-widest">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton icon={Plus} label="New Task" href="/tasks" color="bg-blue-500" shadow="shadow-blue-500/20" />
              <QuickActionButton icon={ShoppingCart} label="Grocery" href="/groceries" color="bg-emerald-500" shadow="shadow-emerald-500/20" />
              <QuickActionButton icon={TrendingUp} label="Income" href="/finance" color="bg-indigo-500" shadow="shadow-indigo-500/20" />
              <QuickActionButton icon={Package} label="Pantry" href="/pantry" color="bg-slate-700" shadow="shadow-slate-700/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, bg, href, trend }: any) {
  return (
    <Link href={href}>
      <Card className="border-none shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-background rounded-[2rem] group overflow-hidden relative">
        <div className={cn("absolute top-0 right-0 size-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150", bg)} />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className={cn("p-3 rounded-2xl transition-colors", bg)}>
              <Icon className={cn("size-6", color)} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-muted-foreground bg-muted px-2 py-1 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Live
            </div>
          </div>
          <div className="mt-5 space-y-1">
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{title}</h3>
            <p className="text-3xl font-black tracking-tight">{value}</p>
            {trend && (
              <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                <TrendingUp className="size-3" />
                {trend}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, href, color, shadow }: any) {
  return (
    <Link href={href} className="block group">
      <div className={cn(
        "p-6 rounded-[2rem] text-white flex flex-col items-center justify-center gap-3 hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden", 
        color,
        shadow
      )}>
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Icon className="size-7 relative z-10" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{label}</span>
      </div>
    </Link>
  );
}
