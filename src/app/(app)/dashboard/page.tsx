import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  ListTodo, 
  ShoppingCart, 
  Banknote, 
  Package, 
  AlertCircle,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
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
      take: 4 
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

  const thisMonthTotal = Number(thisMonthExpenses._sum.amount || 0);
  const lastMonthTotal = Number(lastMonthExpenses._sum.amount || 0);
  const financeTrend = lastMonthTotal > 0 
    ? `${((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0)}% from last month`
    : "First month tracking";

  const firstName = session.user.name?.split(" ")[0] || "User";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Good day, {firstName}. {taskCount === 0 ? "All tasks completed." : `${taskCount} pending tasks require attention.`}
          </p>
        </div>
        <time className="text-xs font-mono text-muted-foreground">
          {format(new Date(), "EEEE, MMM d, yyyy")}
        </time>
      </header>

      {/* Stats Grid */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Household metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            title="Pending tasks"
            value={taskCount}
            detail={`${tasksNewToday} new today`}
            href="/tasks"
            icon={ListTodo}
          />
          <StatTile
            title="Grocery items"
            value={groceryCount}
            detail={`${groceriesNewToday} added today`}
            href="/groceries"
            icon={ShoppingCart}
          />
          <StatTile
            title="Monthly expenses"
            value={`$${thisMonthTotal.toLocaleString()}`}
            detail={financeTrend}
            href="/finance"
            icon={Banknote}
          />
          <StatTile
            title="Tracked pantry"
            value={pantryItems.length}
            detail={`${expiringSoonCount} expiring soon`}
            href="/pantry"
            icon={Package}
          />
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Transactions List */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent transactions</h2>
            <Link 
              href="/finance" 
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              View ledger
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {transactions.map((t) => {
              const isIncome = t.type === "INCOME";
              return (
                <div key={t.id} className="flex items-center justify-between p-4 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">{t.description || "General purchase"}</p>
                    <time className="text-xs text-muted-foreground block">
                      {format(new Date(t.date), "MMM d, yyyy")}
                    </time>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-medium ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {isIncome ? "+" : "-"}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[11px] text-muted-foreground capitalize">
                      {t.type.toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No recorded transactions yet.
              </div>
            )}
          </div>
        </section>

        {/* Pantry & Expiry Notice */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Pantry status</h2>
            <Link 
              href="/pantry" 
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Manage
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {pantryItems.map((item) => {
              const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
              return (
                <div key={item.id} className="p-3.5 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Quantity: {Number(item.quantity)} {item.unit || "units"}
                    </p>
                  </div>
                  {item.expiryDate && (
                    <span className={`text-xs font-mono ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                      {format(new Date(item.expiryDate), "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
            {pantryItems.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Pantry inventory is empty.
              </div>
            )}
          </div>

          {expiringSoonCount > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">{expiringSoonCount} item{expiringSoonCount > 1 ? "s" : ""} expiring this week.</p>
                <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">Check the pantry to plan meals or restock.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  title,
  value,
  detail,
  href,
  icon: Icon
}: {
  title: string;
  value: string | number;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link 
      href={href} 
      className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className="size-4" />
      </div>
      <div className="mt-3">
        <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
          {value}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Link>
  );
}
