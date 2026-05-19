//lib/actions/tasks.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TaskStatus, Priority } from "@prisma/client";

// --- Task List Actions ---

const CreateTaskListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  groupId: z.string().nullable().optional(),
});

export async function createTaskList(values: z.infer<typeof CreateTaskListSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskListSchema.parse(values);

  const list = await prisma.taskList.create({
    data: {
      name: validatedFields.name,
      description: validatedFields.description,
      ownerId: session.user.id,
      groupId: validatedFields.groupId || null,
    },
  });

  revalidatePath("/tasks");
  return list;
}

export async function updateTaskList(id: string, values: z.infer<typeof CreateTaskListSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskListSchema.parse(values);

  await prisma.taskList.update({
    where: { id, ownerId: session.user.id },
    data: {
      name: validatedFields.name,
      description: validatedFields.description,
      groupId: validatedFields.groupId || null,
    },
  });

  revalidatePath("/tasks");
}

export async function deleteTaskList(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.taskList.delete({
    where: { id, ownerId: session.user.id },
  });

  revalidatePath("/tasks");
}

export async function getTaskListById(id: string, groupId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const activeGroupId = groupId !== undefined ? groupId : await getActiveGroupId(session.user.id);

  const list = await prisma.taskList.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId || undefined },
        { shares: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      group: { select: { name: true, icon: true } },
      tasks: {
        include: {
          assignments: { include: { user: true } },
          list: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return list;
}

export async function getTaskLists(groupId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const activeGroupId = groupId !== undefined ? groupId : await getActiveGroupId(session.user.id);

  return await prisma.taskList.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId || undefined },
        { shares: { some: { userId: session.user.id } } },
      ],
      isArchived: false,
    },
    include: {
      group: { select: { name: true, icon: true } },
      _count: {
        select: { tasks: { where: { status: { not: "COMPLETED" } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// --- Task Actions ---

const CreateTaskSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.date().optional().nullable(),
  dueTime: z.date().optional().nullable(),
  assignedUserIds: z.array(z.string()).optional(),
});

export async function createTask(values: z.infer<typeof CreateTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskSchema.parse(values);

  // Security: verify user owns the list or is in the same group
  const groupId = await getActiveGroupId(session.user.id);
  const list = await prisma.taskList.findFirst({
    where: {
      id: validatedFields.listId,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId || undefined },
        { shares: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!list) throw new Error("Task list not found or access denied");

  const task = await prisma.task.create({
    data: {
      listId: validatedFields.listId,
      title: validatedFields.title,
      description: validatedFields.description,
      priority: validatedFields.priority,
      dueDate: validatedFields.dueDate,
      dueTime: validatedFields.dueTime,
      createdBy: session.user.id,
      assignments: {
        create: validatedFields.assignedUserIds?.map(userId => ({
          userId
        }))
      }
    },
  });

  revalidatePath(`/tasks/${values.listId}`);
  revalidatePath("/tasks");
  return task;
}

export async function updateTask(taskId: string, values: z.infer<typeof CreateTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskSchema.parse(values);

  // Security: verify ownership/access
  const groupId = await getActiveGroupId(session.user.id);
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId || undefined } },
        { list: { shares: { some: { userId: session.user.id } } } },
      ]
    }
  });

  if (!task) throw new Error("Task not found or access denied");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: validatedFields.title,
      description: validatedFields.description,
      priority: validatedFields.priority,
      dueDate: validatedFields.dueDate,
      dueTime: validatedFields.dueTime,
      assignments: {
        deleteMany: {},
        create: validatedFields.assignedUserIds?.map(userId => ({
          userId
        }))
      }
    },
  });

  revalidatePath(`/tasks/${task.listId}`);
  revalidatePath("/tasks");
}

export async function getGroupMembersByList(listId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const list = await prisma.taskList.findUnique({
    where: { id: listId },
    select: { groupId: true }
  });

  if (!list?.groupId) return [];

  const members = await prisma.groupMember.findMany({
    where: { groupId: list.groupId },
    include: { user: { select: { id: true, name: true, image: true, email: true } } }
  });

  return members.map(m => m.user);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify ownership via list membership
  const groupId = await getActiveGroupId(session.user.id);

  await prisma.task.updateMany({
    where: { 
      id: taskId,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId || undefined } },
        { list: { shares: { some: { userId: session.user.id } } } },
      ]
    },
    data: { status },
  });

  if (status === "COMPLETED") {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (task?.recurrence && task.recurrence !== "NONE") {
      const nextDueDate = new Date(task.dueDate || new Date());
      
      if (task.recurrence === "DAILY") {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (task.recurrence === "WEEKLY") {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (task.recurrence === "MONTHLY") {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      // Check if next occurrence is within the recurrence end date
      if (!task.recurrenceEnd || nextDueDate <= task.recurrenceEnd) {
        // Fetch current assignments to copy them
        const currentTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignments: true }
        });

        const nextTask = await prisma.task.create({
          data: {
            listId: task.listId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: nextDueDate,
            dueTime: task.dueTime,
            recurrence: task.recurrence,
            recurrenceEnd: task.recurrenceEnd,
            createdBy: task.createdBy,
            status: "NOT_STARTED",
          },
        });

        // Copy assignments
        if (currentTask?.assignments.length) {
          await prisma.taskAssignment.createMany({
            data: currentTask.assignments.map(a => ({
              taskId: nextTask.id,
              userId: a.userId,
            })),
          });
        }
      }
    }

    // Notify group members
    if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { 
          groupId,
          userId: { not: session.user.id }
        },
      });

      const { createNotification } = await import("@/lib/actions/notifications");
      for (const member of members) {
        await createNotification(
          member.userId,
          "TASK_ASSIGNED",
          "Task Completed",
          `${session.user.name || 'A member'} completed: ${task?.title || 'a task'}`
        );
      }
    }
  }

  revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  await prisma.task.deleteMany({
    where: { 
      id: taskId,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId || undefined } },
        { list: { shares: { some: { userId: session.user.id } } } },
      ]
    },
  });

  revalidatePath("/tasks");
}

export async function checkOverdueTasks() {
  const now = new Date();
  
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueDate: { lt: now },
    },
    include: {
      assignments: { include: { user: true } },
      creator: true,
      list: true,
    },
  });

  const { createNotification } = await import("@/lib/actions/notifications");
  
  for (const task of overdueTasks) {
    const recipients = task.assignments.length > 0 
      ? task.assignments.map(a => a.userId) 
      : [task.createdBy];

    for (const userId of recipients) {
      await createNotification(
        userId,
        "TASK_ASSIGNED",
        "Task Overdue!",
        `Action Required: "${task.title}" is past its due date.`
      );
    }
  }

  return { notifiedCount: overdueTasks.length };
}
