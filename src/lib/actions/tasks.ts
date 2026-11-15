//lib/actions/tasks.ts
"use server";

import { NO_GROUP, getWritableGroupId, onlyIfMember } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TaskStatus, Priority, Recurrence } from "@prisma/client";
import { requireGroupAccess } from "@/lib/permissions";

// --- Helpers ---

/** Assignees must be the caller or members of the list's group; anything else is dropped/rejected. */
async function validateAssignees(listGroupId: string | null, callerId: string, ids?: string[]) {
  const unique = Array.from(new Set(ids ?? []));
  if (unique.length === 0) return [];
  const allowed = new Set<string>([callerId]);
  if (listGroupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: listGroupId, userId: { in: unique } },
      select: { userId: true },
    });
    members.forEach((m) => allowed.add(m.userId));
  }
  const bad = unique.filter((id) => !allowed.has(id));
  if (bad.length) throw new Error("Some assignees are not members of this group");
  return unique;
}

/** A group id the client sends must be one the caller can write in. */
async function assertCanUseGroup(userId: string, groupId?: string | null) {
  if (!groupId) return null;
  const writable = await getWritableGroupId(userId, groupId);
  if (!writable) throw new Error("You do not have access to that group");
  return writable;
}

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
  const safeGroupId = await assertCanUseGroup(session.user.id, validatedFields.groupId);

  const list = await prisma.taskList.create({
    data: {
      name: validatedFields.name,
      description: validatedFields.description,
      ownerId: session.user.id,
      groupId: safeGroupId,
    },
  });

  revalidatePath("/tasks");
  return list;
}

export async function updateTaskList(id: string, values: z.infer<typeof CreateTaskListSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskListSchema.parse(values);
  const safeGroupId = await assertCanUseGroup(session.user.id, validatedFields.groupId);

  await prisma.taskList.update({
    where: { id, ownerId: session.user.id },
    data: {
      name: validatedFields.name,
      description: validatedFields.description,
      groupId: safeGroupId,
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

  const activeGroupId = groupId !== undefined ? await onlyIfMember(session.user.id, groupId) : await getActiveGroupId(session.user.id);

  const list = await prisma.taskList.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId ?? NO_GROUP },
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

  const activeGroupId = groupId !== undefined ? await onlyIfMember(session.user.id, groupId) : await getActiveGroupId(session.user.id);

  return await prisma.taskList.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId ?? NO_GROUP },
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
  recurrence: z.nativeEnum(Recurrence).optional().nullable(),
  recurrenceEnd: z.date().optional().nullable(),
  assignedUserIds: z.array(z.string()).optional(),
});

export async function createTask(values: z.infer<typeof CreateTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedFields = CreateTaskSchema.parse(values);

  // Security: verify user owns the list or is in the same group with at least MEMBER role
  const access = await requireGroupAccess("TASK_LIST", validatedFields.listId, session.user.id, "MEMBER");
  const assignees = await validateAssignees(access.groupId ?? null, session.user.id, validatedFields.assignedUserIds);

  const task = await prisma.task.create({
    data: {
      listId: validatedFields.listId,
      title: validatedFields.title,
      description: validatedFields.description,
      priority: validatedFields.priority,
      dueDate: validatedFields.dueDate,
      dueTime: validatedFields.dueTime,
      recurrence: validatedFields.recurrence || "NONE",
      recurrenceEnd: validatedFields.recurrenceEnd,
      createdBy: session.user.id,
      assignments: {
        create: assignees.map(userId => ({ userId })),
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

  // Owner, writable group member, or EDITOR/ADMIN share (VIEWERs and GUESTs are rejected)
  const access = await requireGroupAccess("TASK", taskId, session.user.id, "MEMBER");
  const task = access.resource;
  const assignees = await validateAssignees(access.groupId ?? null, session.user.id, validatedFields.assignedUserIds);

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
        create: assignees.map(userId => ({ userId })),
      }
    },
  });

  revalidatePath(`/tasks/${task.listId}`);
  revalidatePath("/tasks");
}

export async function getGroupMembersByList(listId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Only people who can see the list may see who is in its group
  const { resource: list } = await requireGroupAccess("TASK_LIST", listId, session.user.id, "GUEST");

  if (!list?.groupId) return [];

  const members = await prisma.groupMember.findMany({
    where: { groupId: list.groupId },
    include: { user: { select: { id: true, name: true, image: true, email: true } } }
  });

  return members.map(m => m.user);
}

function nextOccurrence(from: Date, recurrence: string): Date | null {
  const next = new Date(from);
  if (recurrence === "DAILY") next.setDate(next.getDate() + 1);
  else if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (recurrence === "MONTHLY") {
    // Pin to month end instead of rolling over (Jan 31 -> Feb 28, not Mar 3)
    const day = from.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  } else {
    return null; // CUSTOM (and unknown) has no rule yet: never clone a task with the same date
  }
  return next;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Owner, writable group member, or EDITOR/ADMIN share
  const access = await requireGroupAccess("TASK", taskId, userId, "MEMBER");
  const task = access.resource;
  const previousStatus = task.status as TaskStatus;
  const listGroupId: string | null = access.groupId ?? null;

  // No-op if nothing changes (double tap) so recurring tasks never spawn twice
  if (previousStatus === status) return;

  await prisma.$transaction(async (tx) => {
    // Conditional update acts as an optimistic lock: only one concurrent caller wins
    const res = await tx.task.updateMany({
      where: { id: taskId, status: previousStatus },
      data: { status, version: { increment: 1 } },
    });
    if (res.count === 0) return;

    if (status === "COMPLETED" && previousStatus !== "COMPLETED" && task.recurrence && task.recurrence !== "NONE") {
      const nextDueDate = nextOccurrence(new Date(task.dueDate || new Date()), task.recurrence);

      if (nextDueDate && (!task.recurrenceEnd || nextDueDate <= task.recurrenceEnd)) {
        const assignments = await tx.taskAssignment.findMany({ where: { taskId } });
        await tx.task.create({
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
            assignments: { create: assignments.map((a) => ({ userId: a.userId })) },
          },
        });
      }
    }
  });

  // Notify the task's own group (not whatever group happens to be active in the cookie)
  if (status === "COMPLETED" && previousStatus !== "COMPLETED" && listGroupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: listGroupId, userId: { not: userId } },
    });
    const { createNotification } = await import("@/lib/actions/notifications");
    await Promise.all(
      members.map((member) =>
        createNotification(
          member.userId,
          "TASK_COMPLETED",
          "Done",
          `${session.user?.name || "Someone"} finished "${task.title || "a task"}"`
        )
      )
    );
  }

  revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify caller has MEMBER access
  await requireGroupAccess("TASK", taskId, session.user.id, "MEMBER");

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/tasks");
}
