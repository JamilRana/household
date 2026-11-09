import { prisma } from "@/lib/db";
import { MemberRole } from "@prisma/client";

export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
};

export type ResourceKind =
  | "TASK"
  | "TASK_LIST"
  | "GROCERY_LIST"
  | "GROCERY_ITEM"
  | "PANTRY_ITEM"
  | "TRANSACTION"
  | "BUDGET"
  | "GROUP";

export interface AccessCheckResult<T = any> {
  hasAccess: boolean;
  resource: T;
  role: MemberRole | "OWNER" | "VIEWER" | "EDITOR";
  groupId?: string | null;
}

/**
 * Validates that a user has authorized access to a specific resource by ID,
 * inspecting resource ownership, group membership hierarchy, and direct shares.
 */
export async function requireGroupAccess<T = any>(
  kind: ResourceKind,
  resourceId: string,
  userId: string,
  minRole: MemberRole = "MEMBER"
): Promise<AccessCheckResult<T>> {
  if (!userId) {
    throw new Error("Unauthorized: Authentication required");
  }

  let resource: any = null;
  let targetGroupId: string | null = null;
  let isDirectOwner = false;

  switch (kind) {
    case "GROUP": {
      resource = await prisma.group.findUnique({ where: { id: resourceId } });
      if (!resource) throw new Error("Group not found");
      targetGroupId = resource.id;
      isDirectOwner = resource.ownerId === userId;
      break;
    }

    case "TASK_LIST": {
      resource = await prisma.taskList.findUnique({
        where: { id: resourceId },
        include: { shares: { where: { userId } } },
      });
      if (!resource) throw new Error("Task list not found");
      targetGroupId = resource.groupId;
      isDirectOwner = resource.ownerId === userId;
      break;
    }

    case "TASK": {
      resource = await prisma.task.findUnique({
        where: { id: resourceId },
        include: {
          list: {
            select: {
              id: true,
              groupId: true,
              ownerId: true,
              shares: { where: { userId } },
            },
          },
          assignments: { where: { userId } },
        },
      });
      if (!resource) throw new Error("Task not found");
      targetGroupId = resource.list?.groupId || null;
      isDirectOwner = resource.createdBy === userId || resource.list?.ownerId === userId;
      break;
    }

    case "GROCERY_LIST": {
      resource = await prisma.groceryList.findUnique({
        where: { id: resourceId },
        include: { shares: { where: { userId } } },
      });
      if (!resource) throw new Error("Grocery list not found");
      targetGroupId = resource.groupId;
      isDirectOwner = resource.ownerId === userId;
      break;
    }

    case "GROCERY_ITEM": {
      resource = await prisma.groceryItem.findUnique({
        where: { id: resourceId },
        include: {
          list: {
            select: {
              id: true,
              groupId: true,
              ownerId: true,
              shares: { where: { userId } },
            },
          },
        },
      });
      if (!resource) throw new Error("Grocery item not found");
      targetGroupId = resource.list?.groupId || null;
      isDirectOwner = resource.createdBy === userId || resource.list?.ownerId === userId;
      break;
    }

    case "PANTRY_ITEM": {
      resource = await prisma.pantryItem.findUnique({ where: { id: resourceId } });
      if (!resource) throw new Error("Pantry item not found");
      targetGroupId = resource.groupId;
      isDirectOwner = resource.userId === userId;
      break;
    }

    case "TRANSACTION": {
      resource = await prisma.transaction.findUnique({ where: { id: resourceId } });
      if (!resource) throw new Error("Transaction not found");
      targetGroupId = resource.groupId;
      isDirectOwner = resource.userId === userId;
      break;
    }

    case "BUDGET": {
      resource = await prisma.budget.findUnique({ where: { id: resourceId } });
      if (!resource) throw new Error("Budget not found");
      targetGroupId = resource.groupId;
      isDirectOwner = resource.userId === userId;
      break;
    }

    default:
      throw new Error(`Unsupported resource kind: ${kind}`);
  }

  // 1. Direct ownership grant
  if (isDirectOwner) {
    return {
      hasAccess: true,
      resource,
      role: "OWNER",
      groupId: targetGroupId,
    };
  }

  // 2. Direct share check (for Task / TaskList / GroceryList)
  if (resource.shares && resource.shares.length > 0) {
    const shareRole = resource.shares[0].role; // VIEWER | EDITOR | ADMIN
    if (minRole === "GUEST" || (minRole === "MEMBER" && (shareRole === "EDITOR" || shareRole === "ADMIN"))) {
      return {
        hasAccess: true,
        resource,
        role: shareRole,
        groupId: targetGroupId,
      };
    }
  }

  if (resource.list?.shares && resource.list.shares.length > 0) {
    const listShareRole = resource.list.shares[0].role;
    if (minRole === "GUEST" || (minRole === "MEMBER" && (listShareRole === "EDITOR" || listShareRole === "ADMIN"))) {
      return {
        hasAccess: true,
        resource,
        role: listShareRole,
        groupId: targetGroupId,
      };
    }
  }

  // 3. Group membership & role hierarchy check
  if (targetGroupId) {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: targetGroupId,
        },
      },
    });

    if (membership) {
      const userLevel = ROLE_HIERARCHY[membership.role] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

      if (userLevel >= requiredLevel) {
        return {
          hasAccess: true,
          resource,
          role: membership.role,
          groupId: targetGroupId,
        };
      } else {
        throw new Error(
          `Insufficient permissions: Requires minimum role of ${minRole}, but your role is ${membership.role}`
        );
      }
    }
  }

  throw new Error(`Access denied: You do not have permission to access this ${kind}`);
}
