"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, isAfter, isBefore, addDays, startOfToday } from "date-fns";

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
      color: "#ef4444"
    },
    {
      name: "This Week",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), today) && isBefore(new Date(i.expiryDate), nextWeek)).length,
      color: "#f59e0b"
    },
    {
      name: "This Month",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), nextWeek) && isBefore(new Date(i.expiryDate), nextMonth)).length,
      color: "#3b82f6"
    },
    {
      name: "Later",
      count: items.filter(i => i.expiryDate && isAfter(new Date(i.expiryDate), nextMonth)).length,
      color: "#10b981"
    }
  ];

  return (
    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Expiry Timeline</CardTitle>
        <CardDescription>Visual breakdown of item shelf life</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              className="font-bold text-xs" 
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
