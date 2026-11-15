import { redirect } from "next/navigation";
import Link from "next/link";
import { format, differenceInCalendarDays, isToday, isTomorrow } from "date-fns";
import { ArrowRight, Clock, ShoppingCart, Package, Banknote, CalendarCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NO_GROUP } from "@/lib/scope";
import { getActiveGroupId } from "@/lib/actions/user";
import { formatMoney } from "@/lib/format";
import { TodayHeader } from "@/components/dashboard/today-header";
import { TodayTaskRow } from "@/components/dashboard/today-task-row";

export const metadata = { title: "Today" };

function dueLabel(date: Date, now: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const days = differenceInCalendarDays(now, date);
  if (days > 0) return days === 1 ? "Yesterday" : `${days}d late`;
  return format(date, "d MMM");
}

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const groupId = await getActiveGroupId(userId);
  const g = groupId ?? NO_GROUP;

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sameDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), 28), 23, 59, 59);

  const mineOrGroup = { OR: [{ userId }, { groupId: g }] };
  const listAccess = { OR: [{ ownerId: userId }, { groupId: g }] };

  const [dueTasks, dueTaskCount, groceryCount, groceryItems, spentNow, spentThen, recent] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lte: endOfToday },
        OR: [{ createdBy: userId }, { assignments: { some: { userId } } }, { list: { groupId: g } }],
      },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { list: { select: { id: true, name: true } } },
    }),
    prisma.task.count({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lte: endOfToday },
        OR: [{ createdBy: userId }, { assignments: { some: { userId } } }, { list: { groupId: g } }],
      },
    }),
    prisma.groceryItem.count({ where: { status: "PENDING", list: { ...listAccess, isArchived: false } } }),
    prisma.groceryItem.findMany({
      where: { status: "PENDING", list: { ...listAccess, isArchived: false } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true },
    }),
    prisma.transaction.aggregate({
      where: { ...mineOrGroup, type: "EXPENSE", date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...mineOrGroup, type: "EXPENSE", date: { gte: startOfLastMonth, lte: sameDayLastMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: mineOrGroup,
      orderBy: { date: "desc" },
      take: 4,
      include: { category: { select: { name: true } } },
    }),
  ]);

  const spent = Number(spentNow._sum.amount ?? 0);
  const spentBefore = Number(spentThen._sum.amount ?? 0);
  const diff = spent - spentBefore;
  const spendNote =
    spentBefore === 0
      ? "Nothing to compare with yet"
      : Math.abs(diff) < spentBefore * 0.03
      ? "About the same as this time last month"
      : diff > 0
      ? `${formatMoney(diff, undefined, { cents: false })} more than this time last month`
      : `${formatMoney(-diff, undefined, { cents: false })} less than this time last month`;

  const firstName = session.user.name?.split(" ")[0] || "there";
  const overdueCount = dueTasks.filter((t) => t.dueDate && differenceInCalendarDays(now, t.dueDate) > 0).length;
  const summary =
    dueTaskCount === 0
      ? "Nothing is due today. A good day to get ahead."
      : overdueCount > 0
      ? `${dueTaskCount} ${dueTaskCount === 1 ? "thing needs" : "things need"} you today, ${overdueCount} already late.`
      : `${dueTaskCount} ${dueTaskCount === 1 ? "thing is" : "things are"} due today.`;

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <TodayHeader name={firstName} summary={summary} />

      {/* Galley Interconnected Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">DUE TODAY</span>
          <b className="stat-val">{dueTaskCount}</b>
          <small className="stat-sub">
            {overdueCount > 0 ? (
              <span className="text-destructive font-medium">{overdueCount} already late</span>
            ) : (
              "All up to date"
            )}
          </small>
        </div>

        <div>
          <span className="stat-label">TO BUY</span>
          <b className="stat-val">{groceryCount}</b>
          <small className="stat-sub">Groceries on active list</small>
        </div>

        <div>
          <span className="stat-label">RECENT ACTIVITY</span>
          <b className="stat-val">{recent.length}</b>
          <small className="stat-sub">Ledger transactions</small>
        </div>

        <div>
          <span className="stat-label">MONTHLY SPEND</span>
          <b className="stat-val tabular-nums">{formatMoney(spent, undefined, { cents: false })}</b>
          <small className="stat-sub">{spendNote}</small>
        </div>
      </div>

      {/* Main Content Grid with Galley Cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Tasks Section (Galley Span 7) */}
        <section className="lg:col-span-7 galley-card space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-rule pb-3.5">
            <div>
              <h2 className="text-base font-bold text-foreground">To do today</h2>
              <p className="text-xs text-muted-foreground">Active priorities due or assigned</p>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              All tasks <ArrowRight className="size-3" />
            </Link>
          </div>

          {dueTasks.length === 0 ? (
            <div className="rounded-2xl border border-rule/60 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
              All clear. No tasks due today.
            </div>
          ) : (
            <ul className="rounded-2xl border border-rule bg-card/60 divide-y divide-rule overflow-hidden">
              {dueTasks.map((t) => (
                <TodayTaskRow
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  listId={t.list.id}
                  listName={t.list.name}
                  dueLabel={t.dueDate ? dueLabel(t.dueDate, now) : ""}
                  overdue={!!t.dueDate && differenceInCalendarDays(now, t.dueDate) > 0}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Right Column (Galley Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shopping List Card */}
          <section className="galley-card space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-rule pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Shopping list</h2>
                <p className="text-xs text-muted-foreground">Pending groceries needed</p>
              </div>
              <Link
                href="/groceries"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Open list <ArrowRight className="size-3" />
              </Link>
            </div>

            {groceryCount === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Your shopping list is clear.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {groceryCount} {groceryCount === 1 ? "item" : "items"} needed
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {groceryItems.map((i) => (
                    <span
                      key={i.id}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-rule text-foreground"
                    >
                      {i.name}
                    </span>
                  ))}
                  {groceryCount > groceryItems.length && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      +{groceryCount - groceryItems.length} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Quick Shortcuts Card */}
          <section className="galley-card space-y-3.5">
            <div className="border-b border-rule pb-3">
              <h2 className="text-base font-bold text-foreground">Quick access</h2>
              <p className="text-xs text-muted-foreground">Fast navigation & actions</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/tasks"
                className="p-3 rounded-xl border border-rule bg-card/60 hover:bg-muted/50 transition-colors flex flex-col gap-1"
              >
                <span className="font-semibold text-foreground flex items-center justify-between">
                  Tasks <ArrowRight className="size-3 text-muted-foreground" />
                </span>
                <span className="text-[11px] text-muted-foreground">{dueTaskCount} pending</span>
              </Link>
              <Link
                href="/groceries"
                className="p-3 rounded-xl border border-rule bg-card/60 hover:bg-muted/50 transition-colors flex flex-col gap-1"
              >
                <span className="font-semibold text-foreground flex items-center justify-between">
                  Groceries <ArrowRight className="size-3 text-muted-foreground" />
                </span>
                <span className="text-[11px] text-muted-foreground">{groceryCount} to buy</span>
              </Link>
              <Link
                href="/finance"
                className="p-3 rounded-xl border border-rule bg-card/60 hover:bg-muted/50 transition-colors flex flex-col gap-1"
              >
                <span className="font-semibold text-foreground flex items-center justify-between">
                  Finance <ArrowRight className="size-3 text-muted-foreground" />
                </span>
                <span className="text-[11px] text-muted-foreground">{formatMoney(spent, undefined, { cents: false })} spent</span>
              </Link>
              <Link
                href="/teams"
                className="p-3 rounded-xl border border-rule bg-card/60 hover:bg-muted/50 transition-colors flex flex-col gap-1"
              >
                <span className="font-semibold text-foreground flex items-center justify-between">
                  Groups <ArrowRight className="size-3 text-muted-foreground" />
                </span>
                <span className="text-[11px] text-muted-foreground">Manage members</span>
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Finance Card */}
      <section className="galley-card space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-rule pb-3.5">
          <div>
            <h2 className="text-base font-bold text-foreground">Cash flow & spending</h2>
            <p className="text-xs text-muted-foreground">This monthly billing cycle</p>
          </div>
          <Link
            href="/finance"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Open finance <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-12 items-center">
          <div className="md:col-span-5 space-y-1.5">
            <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
              {formatMoney(spent)}
            </p>
            <p className="text-xs text-muted-foreground">{spendNote}.</p>
          </div>

          <div className="md:col-span-7">
            {recent.length > 0 && (
              <ul className="rounded-2xl border border-rule bg-card/60 divide-y divide-rule text-xs overflow-hidden">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="truncate font-medium text-foreground">
                      {t.description || t.category?.name || "Expense"}
                    </span>
                    <span
                      className={
                        t.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400 tabular-nums font-semibold"
                          : "text-foreground tabular-nums font-semibold"
                      }
                    >
                      {t.type === "INCOME" ? "+" : ""}
                      {formatMoney(t.amount, t.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
