"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListTodo, Plus } from "lucide-react";

function greeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayHeader({ name, summary }: { name: string; summary: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const greet = now ? greeting(now.getHours()) : "Good morning";

  return (
    <div className="page-head-galley">
      <div>
        <h1>
          {greet}, {name}
        </h1>
        <p>{summary}</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Link href="/tasks" className="btn-galley-secondary">
          <ListTodo className="size-4 text-primary" />
          <span>Open the board</span>
        </Link>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("lifehub:quick-add", { detail: { kind: "task" } }))
          }
          className="btn-heat"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>New item</span>
        </button>
      </div>
    </div>
  );
}
