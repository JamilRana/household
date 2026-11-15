"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { isAfter, isBefore, addDays, startOfToday } from "date-fns";

interface ExpiryTimelineProps {
  items: any[];
}

export function ExpiryTimeline({ items }: ExpiryTimelineProps) {
  const today = startOfToday();
  const nextWeek = addDays(today, 7);
  const nextMonth = addDays(today, 30);

  const data = [
    {
      name: "Expired",
      count: items.filter(i => i.expiryDate && isBefore(new Date(i.expiryDate), today)).length,
      color: "oklch(0.57 0.22 27)", // Destructive/Rose
    },
    {
      name: "This Week",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), today) && isBefore(new Date(i.expiryDate), nextWeek)).length,
      color: "oklch(0.75 0.18 55)", // Amber
    },
    {
      name: "This Month",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), nextWeek) && isBefore(new Date(i.expiryDate), nextMonth)).length,
      color: "oklch(0.52 0.20 260)", // Primary Blue
    },
    {
      name: "Later",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), nextMonth)).length,
      color: "oklch(0.65 0.18 150)", // Emerald
    },
  ];

  const totalTracked = data.reduce((sum, d) => sum + d.count, 0);

  if (totalTracked === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No items with expiry dates recorded. Add expiry dates to visualize shelf life.
      </div>
    );
  }

  return (
    <div className="w-full h-48 sm:h-52 pt-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 24, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            className="text-xs font-medium fill-muted-foreground"
            width={75}
          />
          <Tooltip 
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-popover border border-border text-popover-foreground text-xs p-2 rounded-md shadow-sm">
                    <span className="font-semibold">{item.name}:</span> {item.count} item{item.count !== 1 ? "s" : ""}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
