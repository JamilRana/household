import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/actions/notifications";

export async function checkOverdueTasks() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Deduplicate: only fetch overdue tasks that haven't been notified in the last 24 hours
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueDate: { lt: now },
      OR: [
        { overdueNotifiedAt: null },
        { overdueNotifiedAt: { lt: oneDayAgo } },
      ],
    },
    include: {
      assignments: { include: { user: true } },
      creator: true,
      list: true,
    },
    take: 100,
  });

  let notifiedCount = 0;

  for (const task of overdueTasks) {
    const recipients =
      task.assignments.length > 0
        ? task.assignments.map((a) => a.userId)
        : [task.createdBy];

    for (const userId of recipients) {
      await createNotification(
        userId,
        "TASK_OVERDUE",
        "Task Overdue!",
        `Action Required: "${task.title}" was due on ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'earlier date'}.`,
        { taskId: task.id, listId: task.listId }
      );
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { overdueNotifiedAt: now },
    });

    notifiedCount++;
  }

  return { notifiedCount };
}
