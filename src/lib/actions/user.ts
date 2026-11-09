"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { ChangePasswordSchema } from "@/lib/validations/auth";

// ─── Profile Actions ───

const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function updateProfile(values: z.infer<typeof UpdateProfileSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: values.name },
  });

  revalidatePath("/settings");
}

export async function changePassword(values: z.infer<typeof ChangePasswordSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = ChangePasswordSchema.parse(values);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.password) throw new Error("No password set for this account");

  const isValid = await bcrypt.compare(validated.currentPassword, user.password);
  if (!isValid) throw new Error("Current password is incorrect");

  const hashed = await bcrypt.hash(validated.newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashed,
        sessionVersion: { increment: 1 }, // Invalidate other active sessions
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PASSWORD_RESET",
        resourceType: "USER",
        resourceId: session.user.id,
      },
    }),
  ]);

  revalidatePath("/settings");
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Soft delete
  await prisma.user.update({
    where: { id: session.user.id },
    data: { deletedAt: new Date() },
  });
}

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          tasks: true,
          groceryItems: true,
          transactions: true,
          pantryItems: true,
        },
      },
    },
  });
}

// ─── Group Context ───

const resolveActiveGroupId = cache(
  async (targetUserId: string, cookieGroupId?: string): Promise<string | null> => {
    if (cookieGroupId) {
      // Validate that user is still an active member of this group
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId: cookieGroupId,
          },
        },
      });

      if (membership) return cookieGroupId;
    }

    // Fallback: return first group membership
    const firstMembership = await prisma.groupMember.findFirst({
      where: { userId: targetUserId },
      select: { groupId: true },
    });

    return firstMembership?.groupId || null;
  }
);

/**
 * Returns the user's currently active group ID from the cookie.
 * Request-scoped cache avoids redundant database queries across server components and actions.
 */
export async function getActiveGroupId(userId?: string): Promise<string | null> {
  const targetUserId = userId || (await auth())?.user?.id;
  if (!targetUserId) return null;

  const cookieStore = await cookies();
  const cookieGroupId = cookieStore.get("active_group_id")?.value;

  return resolveActiveGroupId(targetUserId, cookieGroupId);
}

/**
 * Sets the user's active group. Validates membership before setting.
 */
export async function setActiveGroup(groupId: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (groupId) {
    // Validate membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) throw new Error("Not a member of this group");
  }

  const cookieStore = await cookies();
  if (groupId) {
    cookieStore.set("active_group_id", groupId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    cookieStore.delete("active_group_id");
  }

  revalidatePath("/");
}

/**
 * Returns all groups the user belongs to, with member counts.
 */
export async function getUserGroups() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          _count: {
            select: { members: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
    memberCount: m.group._count.members,
    members: m.group.members.map(member => ({
      ...member.user,
      role: member.role,
      joinedAt: member.joinedAt,
    }))
  }));
}

export async function getUserInvitations() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return [];

  return await prisma.groupInvitation.findMany({
    where: {
      email: session.user.email,
      status: "PENDING",
      expires: { gt: new Date() },
    },
    include: {
      group: {
        select: { name: true, description: true, icon: true }
      },
      inviter: {
        select: { name: true, image: true }
      }
    },
  });
}

export async function removeMember(groupId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Check if current user is owner
  const currentMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (currentMembership?.role !== "OWNER") {
    throw new Error("Only the owner can remove members");
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId, groupId } }
  });

  revalidatePath("/settings");
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Cannot leave if owner (must delete group or transfer ownership)
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (membership?.role === "OWNER") {
    throw new Error("Owners cannot leave the group. Delete the group instead.");
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  revalidatePath("/settings");
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (membership?.role !== "OWNER") {
    throw new Error("Only the owner can delete the group");
  }

  await prisma.group.delete({
    where: { id: groupId }
  });

  revalidatePath("/settings");
}

export async function getAllUsers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await prisma.user.findMany({
    where: {
      deletedAt: null,
      NOT: { id: session.user.id } // Exclude current user from the list if they are already in the team
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * @deprecated Use getActiveGroupId() instead
 */
export async function getUserHouseholdId() {
  return getActiveGroupId();
}
