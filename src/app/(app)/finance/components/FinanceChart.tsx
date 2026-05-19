"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

export function FinanceChart({ data }: { data: any[] }) {
  // Group data by day or category for the chart
  // For now, let's show a simple bar chart of spending by category
  const categoryData = data.reduce((acc: any[], t: any) => {
    if (t.type === "EXPENSE") {
      const existing = acc.find(item => item.name === t.category.name);
      if (existing) {
        existing.value += Number(t.amount);
      } else {
        acc.push({ name: t.category.name, value: Number(t.amount), color: t.category.color });
      }
    }
    return acc;
  }, []);

  if (categoryData.length === 0) {
    return (
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
        <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
          <TrendingDown className="h-10 w-10 text-slate-300" />
        </div>
        <p className="text-slate-400 font-black italic">No expenses recorded this month.</p>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-black">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData}>
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tick={{ fontWeight: "bold" }}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
              tick={{ fontWeight: "bold" }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontWeight: 'bold'
              }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
