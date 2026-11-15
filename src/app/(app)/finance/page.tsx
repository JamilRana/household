import { formatMoney } from "@/lib/format";
import { getTransactions, getCategories, getBudgets, getFinanceStats, getMonthlyBreakdown } from "@/lib/actions/finance";
import { Wallet, TrendingUp, TrendingDown, Banknote } from "lucide-react";
import { TransactionModal } from "./components/TransactionModal";
import { BudgetModal } from "./components/BudgetModal";
import { FinanceChart } from "./components/FinanceChart";
import { CategoryModal } from "./components/CategoryModal";
import { TransactionList } from "./components/TransactionList";
import { MonthlyBreakdown } from "./components/MonthlyBreakdown";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const transactions = await getTransactions();
  const budgets = await getBudgets();
  const categories = await getCategories();
  const stats = await getFinanceStats();
  const breakdown = await getMonthlyBreakdown();

  if (!stats) return null;

  const { current } = stats;

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Finance</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              Ledger & Budgets
            </span>
          </div>
          <p>
            Income, expenses, and cash flow balance for this monthly cycle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CategoryModal categories={categories} />
          <BudgetModal categories={categories} />
          <TransactionModal categories={categories} />
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">NET BALANCE</span>
          <b className="stat-val tabular-nums">{formatMoney(current.balance)}</b>
          <small className="stat-sub">Current household balance</small>
        </div>

        <div>
          <span className="stat-label">INCOME</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatMoney(current.income)}
          </b>
          <small className="stat-sub">Inflow this month</small>
        </div>

        <div>
          <span className="stat-label">EXPENSES</span>
          <b className="stat-val text-rose-600 dark:text-rose-400 tabular-nums">
            {formatMoney(current.expense)}
          </b>
          <small className="stat-sub">Outflow this month</small>
        </div>

        <div>
          <span className="stat-label">TRANSACTIONS</span>
          <b className="stat-val tabular-nums">{transactions.length}</b>
          <small className="stat-sub">Recorded entries</small>
        </div>
      </div>

      {/* Charts & Breakdown Grid in Galley Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 galley-card space-y-3">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Cash Flow Overview</h2>
              <p className="text-xs text-muted-foreground">Category Distribution</p>
            </div>
          </div>
          <FinanceChart data={breakdown} />
        </div>

        <div className="galley-card space-y-3">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly History</h2>
              <p className="text-xs text-muted-foreground">Past Cycles</p>
            </div>
          </div>
          <MonthlyBreakdown breakdown={breakdown} />
        </div>
      </div>

      {/* Ledger Table Section in Galley Card */}
      <div className="galley-card space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Transaction Ledger</h2>
            <p className="text-xs text-muted-foreground">{transactions.length} total entries recorded</p>
          </div>
        </div>
        <TransactionList 
          initialTransactions={transactions} 
          categories={categories} 
        />
      </div>
    </div>
  );
}
