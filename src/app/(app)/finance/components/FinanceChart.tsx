"use client";

import { formatMoney } from "@/lib/format";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { TrendingDown } from "lucide-react";

export function FinanceChart({ data }: { data: any[] }) {
  const categoryData = data.reduce((acc: any[], t: any) => {
    if (t.type === "EXPENSE") {
      const existing = acc.find((item) => item.name === t.category?.name);
      if (existing) {
        existing.value += Number(t.amount);
      } else {
        acc.push({
          name: t.category?.name || "Uncategorized",
          value: Number(t.amount),
          color: t.category?.color || "oklch(0.52 0.20 260)",
        });
      }
    }
    return acc;
  }, []);

  if (categoryData.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-center space-y-2">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center">
          <TrendingDown className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">No expenses recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatMoney(value, undefined, { cents: false })}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-popover border border-border text-popover-foreground text-xs p-2 rounded-md shadow-sm">
                    <span className="font-semibold">{item.name}:</span> {formatMoney(item.value)}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
