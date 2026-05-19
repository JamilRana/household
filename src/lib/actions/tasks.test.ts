import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTaskStatus } from "./tasks";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

describe("updateTaskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new task instance when a recurring task is completed", async () => {
    // Mock session
    (auth as any).mockResolvedValue({ user: { id: "user-1", name: "Test User" } });

    // Mock task
    const mockTask = {
      id: "task-1",
      title: "Recurring Task",
      status: "NOT_STARTED",
      recurrence: "DAILY",
      dueDate: new Date("2026-05-01"),
      listId: "list-1",
      createdBy: "user-1",
      assignments: [],
    };

    (prisma.task.findUnique as any).mockResolvedValue(mockTask);
    (prisma.task.update as any).mockResolvedValue({ ...mockTask, status: "COMPLETED" });
    (prisma.groupMember.findMany as any).mockResolvedValue([]);

    await updateTaskStatus("task-1", "COMPLETED");

    // Check if update was called
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { 
        id: "task-1", 
        OR: [
          { createdBy: "user-1" },
          { list: { ownerId: "user-1" } },
          { list: { groupId: undefined } },
          { list: { shares: { some: { userId: "user-1" } } } },
        ]
      },
      data: { status: "COMPLETED" },
    });

    // Check if new task was created (recurrence logic)
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: "Recurring Task",
        status: "NOT_STARTED",
      })
    }));
  });
});
