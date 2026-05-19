import { getTransactions, getCategories, getBudgets, getFinanceStats, getMonthlyBreakdown } from "@/lib/actions/finance";
import { Banknote, TrendingUp, TrendingDown, Wallet, Calendar, Trash2, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TransactionModal } from "./components/TransactionModal";
import { BudgetModal } from "./components/BudgetModal";
import { FinanceChart } from "./components/FinanceChart";
import { CategoryModal } from "./components/CategoryModal";
import { deleteTransaction, deleteBudget } from "@/lib/actions/finance";
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
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-12 max-w-7xl mx-auto relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-blue-400/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] bg-emerald-400/5 blur-[100px] rounded-full" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 sm:gap-4">
            <span className="bg-blue-600 w-2.5 sm:w-3 h-10 sm:h-14 rounded-2xl inline-block shadow-lg shadow-blue-200" />
            Wealth
          </h1>
          <p className="text-slate-400 text-base sm:text-xl font-bold tracking-tight">Your financial health at a glance.</p>
        </div>
        <div className="flex gap-2 sm:gap-4">
          <CategoryModal categories={categories} />
          <TransactionModal categories={categories} />
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-3">
        <Card className="border-none shadow-2xl bg-linear-to-br from-slate-900 via-blue-900 to-indigo-950 text-white overflow-hidden relative group min-h-[180px] sm:min-h-[220px] flex flex-col justify-center rounded-[2rem]">
          <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-20 group-hover:scale-110 transition-all duration-700">
            <Wallet className="h-28 w-28 sm:h-40 sm:w-40 rotate-12" />
          </div>
          <CardHeader className="pb-1 sm:pb-2 px-6 sm:px-8">
            <CardTitle className="text-blue-300/80 text-xs sm:text-sm font-black uppercase tracking-[0.3em]">Net Monthly</CardTitle>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            <div className="text-4xl sm:text-6xl font-black tracking-tighter">${current.balance.toLocaleString()}</div>
            <div className="mt-4 sm:mt-8 flex items-center gap-3">
              <span className={cn(
                "bg-white/10 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl text-[9px] sm:text-[11px] font-black backdrop-blur-md uppercase tracking-widest border border-white/10",
                deltas.balance >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {deltas.balance >= 0 ? "+" : ""}{deltas.balance}% vs Last Month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group flex flex-col justify-center min-h-[160px] sm:min-h-[220px] rounded-[2rem] border border-slate-100/50 dark:border-slate-800/50">
          <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
            <TrendingUp className="h-32 w-32 sm:h-48 sm:w-48 text-emerald-500 -rotate-6" />
          </div>
          <CardHeader className="pb-1 sm:pb-2 px-6 sm:px-8">
            <CardTitle className="text-slate-400 text-xs sm:text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2 sm:gap-3">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
              Monthly In
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            <div className="text-3xl sm:text-5xl font-black text-emerald-600 tracking-tighter">${current.income.toLocaleString()}</div>
            <p className={cn(
              "text-xs sm:text-sm mt-2 sm:mt-4 flex items-center gap-1.5 sm:gap-2 font-black italic",
              deltas.income >= 0 ? "text-emerald-600/60" : "text-rose-600/60"
            )}>
              {deltas.income >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              {Math.abs(deltas.income)}% {deltas.income >= 0 ? "INCREASE" : "DECREASE"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group flex flex-col justify-center min-h-[160px] sm:min-h-[220px] rounded-[2rem] border border-slate-100/50 dark:border-slate-800/50">
          <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
            <TrendingDown className="h-32 w-32 sm:h-48 sm:w-48 text-rose-500 rotate-6" />
          </div>
          <CardHeader className="pb-1 sm:pb-2 px-6 sm:px-8">
            <CardTitle className="text-slate-400 text-xs sm:text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2 sm:gap-3">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500 shadow-lg shadow-rose-200" />
              Monthly Out
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            <div className="text-3xl sm:text-5xl font-black text-rose-600 tracking-tighter">${current.expense.toLocaleString()}</div>
            <p className={cn(
              "text-xs sm:text-sm mt-2 sm:mt-4 flex items-center gap-1.5 sm:gap-2 font-black italic",
              deltas.expense <= 0 ? "text-emerald-600/60" : "text-rose-600/60"
            )}>
              {deltas.expense <= 0 ? <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              {Math.abs(deltas.expense)}% {deltas.expense <= 0 ? "DECREASE" : "INCREASE"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:gap-12 lg:grid-cols-12">
        {/* Chart & Transactions Section */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-12">
          <FinanceChart data={transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth())} />

          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
                Ledger
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              </h2>
            </div>
            <TransactionList initialTransactions={transactions} categories={categories} />
          </div>
        </div>

        {/* Budgets & Goals Section */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-12">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-2 sm:gap-3 px-2">
              Budgets
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </h2>
            <div className="grid gap-4 sm:gap-6">
              {budgets.map((b: any) => {
                const spent = b.spent;
                const percent = Math.min(Math.round((spent / Number(b.amount)) * 100), 100);
                const remaining = Math.max(Number(b.amount) - spent, 0);

                return (
                  <Card key={b.id} className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2rem] border border-slate-100/50 dark:border-slate-800/50">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: b.category.color }}>
                            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <div>
                            <span className="block font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg leading-tight">{b.category.name}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{b.period} LIMIT</span>
                          </div>
                        </div>
                        <form action={async () => {
                          "use server";
                          await deleteBudget(b.id);
                        }}>
                          <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 text-slate-200 dark:text-slate-700 hover:text-rose-500 rounded-xl transition-colors">
                            <Trash2 className="h-4 sm:h-5 w-4 sm:w-5" />
                          </Button>
                        </form>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                          <span className="text-slate-400">Consumption</span>
                          <span className={cn(percent > 85 ? "text-rose-500 animate-pulse" : "text-blue-600")}>{percent}%</span>
                        </div>
                        <div className="h-3 sm:h-4 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden p-0.5 sm:p-1">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 shadow-sm",
                              percent > 85 ? "bg-rose-500" : "bg-blue-600"
                            )} 
                            style={{ width: `${percent}%` }} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-5 sm:mt-7 pt-5 sm:pt-7 border-t border-slate-50 dark:border-slate-800/50">
                        <div>
                          <span className="block text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Spent</span>
                          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">${spent.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Remaining</span>
                          <span className={cn(
                            "text-lg sm:text-xl font-black tracking-tighter",
                            remaining < 100 ? "text-rose-500" : "text-emerald-500"
                          )}>${remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <BudgetModal categories={categories} />
            </div>
          </div>

          {/* Monthly Summary Breakdown */}
          <MonthlyBreakdown breakdown={breakdown} />

          {/* Quick Info Card */}
          <Card className="border-none bg-blue-600 text-white shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden group">
            <CardContent className="p-8">
              <h3 className="text-2xl font-black mb-2">Smart Insight</h3>
              <p className="text-blue-100 text-sm font-medium leading-relaxed mb-6 opacity-80">
                You've spent 20% less on **Dining Out** this month compared to last. Keep it up to reach your savings goal!
              </p>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest text-xs py-6 rounded-2xl transition-transform group-hover:scale-[1.02]">
                Detailed Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
