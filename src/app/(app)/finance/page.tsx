import { getTransactions, getCategories, getBudgets, getFinanceStats, getMonthlyBreakdown } from "@/lib/actions/finance";
import { Banknote, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { TransactionModal } from "./components/TransactionModal";
import { BudgetModal } from "./components/BudgetModal";
import { FinanceChart } from "./components/FinanceChart";
import { CategoryModal } from "./components/CategoryModal";
import { TransactionList } from "./components/TransactionList";
import { MonthlyBreakdown } from "./components/MonthlyBreakdown";

export default async function FinancePage() {
  const transactions = await getTransactions();
  const budgets = await getBudgets();
  const categories = await getCategories();
  const stats = await getFinanceStats();
  const breakdown = await getMonthlyBreakdown();

  if (!stats) return null;

  const { current, deltas } = stats;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Finance
          </h1>
          <p className="text-sm text-muted-foreground">
            Income, expenses, and budget allocation for this cycle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoryModal categories={categories} />
          <BudgetModal categories={categories} />
          <TransactionModal categories={categories} />
        </div>
      </header>

      {/* Metrics Grid */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-medium text-muted-foreground">Monthly balance</span>
          <div className="mt-2 text-2xl font-semibold tracking-tight font-mono text-foreground">
            ${current.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Net income vs expense
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-medium text-muted-foreground">Total income</span>
          <div className="mt-2 text-2xl font-semibold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
            +${current.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Recorded receipts this month
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-medium text-muted-foreground">Total expenses</span>
          <div className="mt-2 text-2xl font-semibold tracking-tight font-mono text-foreground">
            ${current.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Outflow across all categories
          </span>
        </div>
      </section>

      {/* Charts & Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Cash flow summary</h2>
          <FinanceChart data={breakdown} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly history</h2>
          <MonthlyBreakdown breakdown={breakdown} />
        </div>
      </div>

      {/* Ledger Table */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Transaction ledger</h2>
        <TransactionList 
          initialTransactions={transactions} 
          categories={categories} 
        />
      </section>
    </div>
  );
}
