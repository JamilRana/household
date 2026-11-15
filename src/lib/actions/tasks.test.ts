import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTaskStatus } from "./tasks";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const baseTask = () => ({
  id: "task-1",
  title: "Recurring Task",
  description: null,
  status: "NOT_STARTED",
  priority: "MEDIUM",
  recurrence: "DAILY",
  recurrenceEnd: null,
  dueDate: new Date(2026, 4, 1),
  dueTime: null,
  listId: "list-1",
  createdBy: "user-1",
  list: { id: "list-1", groupId: null, ownerId: "user-1", shares: [] },
  assignments: [],
});

describe("updateTaskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user-1", name: "Test User" } });
    (prisma.task.findUnique as any).mockResolvedValue(baseTask());
    (prisma.task.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.taskAssignment.findMany as any).mockResolvedValue([]);
  });

  it("creates the next instance (+1 day) when a DAILY task is completed", async () => {
    await updateTaskStatus("task-1", "COMPLETED");

    expect(prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "task-1", status: "NOT_STARTED" } })
    );
    const created = (prisma.task.create as any).mock.calls[0][0].data;
    expect(created.title).toBe("Recurring Task");
    expect(created.dueDate).toEqual(new Date(2026, 4, 2));
    expect(created.status).toBe("NOT_STARTED");
  });

  it("is a no-op when the status does not change (double tap never spawns a second copy)", async () => {
    (prisma.task.findUnique as any).mockResolvedValue({ ...baseTask(), status: "COMPLETED" });
    await updateTaskStatus("task-1", "COMPLETED");
    expect(prisma.task.updateMany).not.toHaveBeenCalled();
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("does not spawn a copy when it lost a concurrent race", async () => {
    (prisma.task.updateMany as any).mockResolvedValue({ count: 0 });
    await updateTaskStatus("task-1", "COMPLETED");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("does not clone CUSTOM recurrence with the same date", async () => {
    (prisma.task.findUnique as any).mockResolvedValue({ ...baseTask(), recurrence: "CUSTOM" });
    await updateTaskStatus("task-1", "COMPLETED");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("pins monthly recurrence to month end (Jan 31 -> Feb 28)", async () => {
    (prisma.task.findUnique as any).mockResolvedValue({
      ...baseTask(),
      recurrence: "MONTHLY",
      dueDate: new Date(2027, 0, 31),
    });
    await updateTaskStatus("task-1", "COMPLETED");
    const due: Date = (prisma.task.create as any).mock.calls[0][0].data.dueDate;
    expect([due.getMonth(), due.getDate()]).toEqual([1, 28]);
  });

  it("respects recurrenceEnd", async () => {
    (prisma.task.findUnique as any).mockResolvedValue({ ...baseTask(), recurrenceEnd: new Date(2026, 4, 1) });
    await updateTaskStatus("task-1", "COMPLETED");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("rejects a user who has no access to the task", async () => {
    (auth as any).mockResolvedValue({ user: { id: "stranger" } });
    await expect(updateTaskStatus("task-1", "COMPLETED")).rejects.toThrow(/denied/i);
    expect(prisma.task.updateMany).not.toHaveBeenCalled();
  });
});
