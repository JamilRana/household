"use client";

import { formatMoney } from "@/lib/format";
import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
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

  if (breakdown.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-center text-xs text-muted-foreground">
        No monthly history recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="divide-y divide-border/60">
        {itemsToShow.map((item) => (
          <div key={item.key} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground text-xs leading-tight">
                {item.month} {item.year}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  item.balance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {item.balance >= 0 ? "+" : ""}
                {formatMoney(item.balance)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span className="tabular-nums">+{formatMoney(item.income, undefined, { cents: false })}</span>
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="size-3 text-rose-500" />
                <span className="tabular-nums">-{formatMoney(item.expense, undefined, { cents: false })}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {breakdown.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs font-medium text-primary hover:underline flex items-center justify-center gap-1 pt-1 cursor-pointer"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              View all ({breakdown.length}) <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
