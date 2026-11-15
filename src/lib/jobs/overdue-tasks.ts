import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/actions/notifications";

export async function checkOverdueTasks() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Deduplicate: only fetch overdue tasks that haven't been notified in the last 24 hours
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      // Due today is not overdue yet; only tasks from before today count
      dueDate: { lt: startOfToday },
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
        "Overdue",
        `"${task.title}" was due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }) : "earlier"}.`,
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
