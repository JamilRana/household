"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { NO_GROUP } from "@/lib/scope";

export async function getNavCounts() {
  const session = await auth();
  if (!session?.user?.id) return { tasks: 0, groceries: 0 };

  const userId = session.user.id;
  const groupId = await getActiveGroupId(userId);
  const g = groupId ?? NO_GROUP;

  try {
    const [tasksCount, groceriesCount] = await Promise.all([
      prisma.task.count({
        where: {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          OR: [
            { createdBy: userId },
            { assignments: { some: { userId } } },
            { list: { groupId: g } },
          ],
        },
      }),
      prisma.groceryItem.count({
        where: {
          status: "PENDING",
          list: {
            OR: [{ ownerId: userId }, { groupId: g }],
            isArchived: false,
          },
        },
      }),
    ]);

    return {
      tasks: tasksCount,
      groceries: groceriesCount,
    };
  } catch (err) {
    console.error("Error fetching nav counts:", err);
    return { tasks: 0, groceries: 0 };
  }
}
