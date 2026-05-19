"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BreakdownItem {
  key: string;
  year: number;
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface MonthlyBreakdownProps {
  breakdown: BreakdownItem[];
}

export function MonthlyBreakdown({ breakdown }: MonthlyBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  // Show only first 3 months by default, expand for all
  const itemsToShow = expanded ? breakdown : breakdown.slice(0, 3);

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 border border-slate-100/50 dark:border-slate-800/50">
      <CardHeader className="pb-2 border-b border-slate-50 dark:border-slate-800/50 flex flex-row items-center justify-between">
        <CardTitle className="text-slate-400 text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
          <Calendar className="h-5 w-5 text-blue-600 animate-pulse" />
          Monthly Summaries
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {itemsToShow.map((item) => (
            <div key={item.key} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-black text-slate-900 dark:text-slate-100 text-lg leading-tight">
                    {item.month} {item.year}
                  </span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em]">MONTHLY STATS</span>
                </div>
                <div className={cn(
                  "text-xl font-black tracking-tighter",
                  item.balance >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {item.balance >= 0 ? "+" : ""}${item.balance.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 dark:bg-emerald-950/30 p-1.5 rounded-lg text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black uppercase tracking-[0.15em]">Income</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">${item.income.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-rose-100 dark:bg-rose-950/30 p-1.5 rounded-lg text-rose-600">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-black uppercase tracking-[0.15em]">Expenses</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">${item.expense.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {breakdown.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic font-medium">
              No transaction history recorded yet.
            </div>
          )}
        </div>

        {breakdown.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-6 text-center text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 py-2 border-t border-slate-50 dark:border-slate-800/50 pt-4"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View Full Breakdown <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
