"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/lib/actions/tasks";

interface Props {
  id: string;
  title: string;
  listId: string;
  listName: string;
  dueLabel: string;
  overdue: boolean;
}

export function TodayTaskRow({ id, title, listId, listName, dueLabel, overdue }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "COMPLETED" | "NOT_STARTED") {
    setBusy(true);
    setDone(next === "COMPLETED"); // instant feedback, rolled back below if the server says no
    try {
      await updateTaskStatus(id, next);
      router.refresh();
    } catch (err) {
      setDone(next !== "COMPLETED");
      toast.error(err instanceof Error ? err.message : "Could not update the task");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (busy) return;
    if (done) return setStatus("NOT_STARTED");
    await setStatus("COMPLETED");
    toast(`Done: ${title}`, { action: { label: "Undo", onClick: () => setStatus("NOT_STARTED") } });
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={complete}
        aria-label={done ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
        aria-pressed={done}
        className={cn(
          "size-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-primary"
        )}
      >
        {done && <Check className="size-3.5" />}
      </button>
      <Link href={`/tasks/${listId}`} className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", done && "line-through text-muted-foreground")}>{title}</p>
        <p className="text-xs text-muted-foreground truncate">{listName}</p>
      </Link>
      <span className={cn("text-xs shrink-0", overdue && !done ? "text-destructive font-medium" : "text-muted-foreground")}>
        {dueLabel}
      </span>
    </li>
  );
}
