"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getSharedUsersRaw(resourceType: "TASK_LIST" | "TASK" | "GROCERY_LIST", resourceId: string) {
  try {
    const shares = await prisma.share.findMany({
      where: {
        resourceType,
        resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return shares.map((share: any) => share.user);
  } catch (error) {
    console.error("Error fetching shares:", error);
    return [];
  }
}

export async function getSharedUsers(resourceType: "TASK_LIST" | "TASK" | "GROCERY_LIST", resourceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  let hasAccess = false;
  if (resourceType === "TASK_LIST") {
    const list = await prisma.taskList.findFirst({
      where: {
        id: resourceId,
        OR: [
          { ownerId: session.user.id },
          { groupId: { not: null } },
        ],
      },
    });
    hasAccess = !!list;
  } else if (resourceType === "GROCERY_LIST") {
    const list = await prisma.groceryList.findFirst({
      where: {
        id: resourceId,
        OR: [
          { ownerId: session.user.id },
          { groupId: { not: null } },
        ],
      },
    });
    hasAccess = !!list;
  } else {
    const task = await prisma.task.findFirst({
      where: {
        id: resourceId,
        OR: [
          { createdBy: session.user.id },
          { list: { ownerId: session.user.id } },
          { list: { groupId: { not: null } } },
        ],
      },
    });
    hasAccess = !!task;
  }

  if (!hasAccess) return [];

  return await getSharedUsersRaw(resourceType, resourceId);
}

const ShareByUserSchema = z.object({
  resourceType: z.enum(["TASK_LIST", "TASK", "GROCERY_LIST"]),
  resourceId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export async function shareResourceByUser(values: z.infer<typeof ShareByUserSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = ShareByUserSchema.parse(values);

  // Verify ownership
  if (validated.resourceType === "TASK_LIST") {
    const list = await prisma.taskList.findFirst({
      where: {
        id: validated.resourceId,
        ownerId: session.user.id,
      },
    });
    if (!list) throw new Error("List not found or access denied");
  } else if (validated.resourceType === "GROCERY_LIST") {
    const list = await prisma.groceryList.findFirst({
      where: {
        id: validated.resourceId,
        ownerId: session.user.id,
      },
    });
    if (!list) throw new Error("Grocery list not found or access denied");
  } else {
    const task = await prisma.task.findFirst({
      where: {
        id: validated.resourceId,
        OR: [
          { createdBy: session.user.id },
          { list: { ownerId: session.user.id } },
        ],
      },
    });
    if (!task) throw new Error("Task not found or access denied");
  }

  // Check if already shared using Prisma Client
  const existing = await prisma.share.findFirst({
    where: {
      resourceType: validated.resourceType,
      resourceId: validated.resourceId,
      userId: validated.userId,
    },
  });

  if (existing) {
    await prisma.share.update({
      where: { id: existing.id },
      data: {
        role: validated.role,
      },
    });
  } else {
    await prisma.share.create({
      data: {
        resourceType: validated.resourceType,
        resourceId: validated.resourceId,
        userId: validated.userId,
        role: validated.role,
        invitedBy: session.user.id,
      },
    });
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function shareResourceByGroup(values: { resourceType: "TASK_LIST" | "TASK" | "GROCERY_LIST"; resourceId: string; groupId: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify ownership
  if (values.resourceType === "TASK_LIST") {
    const list = await prisma.taskList.findFirst({
      where: {
        id: values.resourceId,
        ownerId: session.user.id,
      },
    });
    if (!list) throw new Error("List not found or access denied");
  } else if (values.resourceType === "GROCERY_LIST") {
    const list = await prisma.groceryList.findFirst({
      where: {
        id: values.resourceId,
        ownerId: session.user.id,
      },
    });
    if (!list) throw new Error("Grocery list not found or access denied");
  } else {
    const task = await prisma.task.findFirst({
      where: {
        id: values.resourceId,
        OR: [
          { createdBy: session.user.id },
          { list: { ownerId: session.user.id } },
        ],
      },
    });
    if (!task) throw new Error("Task not found or access denied");
  }

  // Get all group members
  const members = await prisma.groupMember.findMany({
    where: { groupId: values.groupId },
    select: { userId: true },
  });

  // Share with each member (except owner)
  for (const member of members) {
    if (member.userId === session.user.id) continue;

    const existing = await prisma.share.findFirst({
      where: {
        resourceType: values.resourceType,
        resourceId: values.resourceId,
        userId: member.userId,
      },
    });

    if (!existing) {
      await prisma.share.create({
        data: {
          resourceType: values.resourceType,
          resourceId: values.resourceId,
          userId: member.userId,
          role: "VIEWER",
          invitedBy: session.user.id,
        },
      });
    }
  }

  // Update the list's groupId to link it with the group
  if (values.resourceType === "TASK_LIST") {
    await prisma.taskList.update({
      where: { id: values.resourceId },
      data: { groupId: values.groupId },
    });
  } else if (values.resourceType === "GROCERY_LIST") {
    await prisma.groceryList.update({
      where: { id: values.resourceId },
      data: { groupId: values.groupId },
    });
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function removeShare(resourceType: "TASK_LIST" | "TASK" | "GROCERY_LIST", resourceId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  let resource = null;
  if (resourceType === "TASK_LIST") {
    resource = await prisma.taskList.findFirst({
      where: { id: resourceId, ownerId: session.user.id },
    });
  } else if (resourceType === "GROCERY_LIST") {
    resource = await prisma.groceryList.findFirst({
      where: { id: resourceId, ownerId: session.user.id },
    });
  } else {
    resource = await prisma.task.findFirst({
      where: {
        id: resourceId,
        OR: [
          { createdBy: session.user.id },
          { list: { ownerId: session.user.id } },
        ],
      },
    });
  }

  if (!resource) throw new Error("Unauthorized");

  await prisma.share.deleteMany({
    where: {
      resourceType,
      resourceId,
      userId,
    },
  });

  revalidatePath("/tasks");
  return { success: true };
}

export async function getAvailableUsersForShare(resourceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Get users who are already shared
  const existingShares = await prisma.share.findMany({
    where: { resourceId },
    select: { userId: true },
  });
  const existingUserIds = existingShares.map((s: any) => s.userId);
  existingUserIds.push(session.user.id);

  // Get all users except current user and already shared
  return await prisma.user.findMany({
    where: {
      id: { notIn: existingUserIds },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}

export async function getGroupsForShare() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Get user's groups
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  });

  return memberships.map((m: any) => m.group);
}