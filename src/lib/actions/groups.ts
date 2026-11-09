"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";

export async function createGroup(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.create({
    data: {
      name,
      description,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
  });

  if (group?.id) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        resourceType: "GROUP",
        resourceId: group.id,
        changes: { name, description },
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/teams");
  return group;
}

export async function generateInvitation(groupId: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify permissions
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new Error("Only owners and admins can invite members");
  }

  // Generate high-entropy raw token, store only SHA-256 hash in DB
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const invitation = await prisma.groupInvitation.create({
    data: {
      email: email.toLowerCase(),
      token: tokenHash,
      expires,
      groupId,
      inviterId: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SHARE",
      resourceType: "GROUP",
      resourceId: groupId,
      changes: { invitedEmail: email.toLowerCase() },
    },
  });

  revalidatePath("/settings");
  // Return the raw token to caller for link generation
  return { ...invitation, rawToken };
}

export async function acceptInvitation(rawToken: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await prisma.groupInvitation.findUnique({
    where: { token: tokenHash },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expires < new Date()) {
    throw new Error("Invalid or expired invitation");
  }

  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: invitation.groupId,
        },
      },
      create: {
        userId: session.user.id,
        groupId: invitation.groupId,
        role: "MEMBER",
      },
      update: {
        role: "MEMBER",
      },
    }),
    prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        resourceType: "GROUP",
        resourceId: invitation.groupId,
        changes: { memberJoined: session.user.email },
      },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function renameGroup(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new Error("Only group owners and admins can rename the group");
  }

  await prisma.group.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (membership?.role === "OWNER") {
    throw new Error("Owners cannot leave. Transfer ownership or delete the group instead.");
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId, ownerId: session.user.id },
  });

  if (!group) throw new Error("Group not found or you are not the owner");

  // Manual cascade for relationMode = "prisma"
  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        resourceType: "GROUP",
        resourceId: groupId,
        changes: { groupName: group.name },
      },
    }),
    prisma.groupInvitation.deleteMany({ where: { groupId } }),
    prisma.groupMember.deleteMany({ where: { groupId } }),
    prisma.pantryItem.deleteMany({ where: { groupId } }),
    prisma.groceryItem.deleteMany({ where: { list: { groupId } } }),
    prisma.groceryList.deleteMany({ where: { groupId } }),
    prisma.taskAssignment.deleteMany({ where: { task: { list: { groupId } } } }),
    prisma.taskComment.deleteMany({ where: { task: { list: { groupId } } } }),
    prisma.task.deleteMany({ where: { list: { groupId } } }),
    prisma.taskList.deleteMany({ where: { groupId } }),
    prisma.transaction.deleteMany({ where: { groupId } }),
    prisma.budget.deleteMany({ where: { groupId } }),
    prisma.recurringRule.deleteMany({ where: { groupId } }),
    prisma.group.delete({ where: { id: groupId } }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: "ADMIN" | "MEMBER" | "GUEST"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    throw new Error("Insufficient permissions");
  }

  const updated = await prisma.groupMember.update({
    where: { id: memberId },
    data: { role },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ROLE_CHANGE",
      resourceType: "GROUP",
      resourceId: groupId,
      changes: { memberId, newRole: role },
    },
  });

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function transferOwnership(groupId: string, newOwnerId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId, ownerId: session.user.id },
  });

  if (!group) throw new Error("Unauthorized: Only the current owner can transfer ownership");

  await prisma.$transaction([
    prisma.group.update({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    }),
    prisma.groupMember.update({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
      data: { role: "OWNER" },
    }),
    prisma.groupMember.update({
      where: { userId_groupId: { userId: session.user.id, groupId } },
      data: { role: "ADMIN" },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "OWNERSHIP_TRANSFER",
        resourceType: "GROUP",
        resourceId: groupId,
        changes: { previousOwner: session.user.id, newOwner: newOwnerId },
      },
    }),
  ]);

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function updateGroupDetails(
  id: string,
  data: { name?: string; description?: string; icon?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify caller has OWNER or ADMIN role in this group
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: id } },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new Error("Insufficient permissions: Group OWNER or ADMIN role required");
  }

  await prisma.group.update({
    where: { id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      resourceType: "GROUP",
      resourceId: id,
      changes: data,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function removeMember(groupId: string, memberId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.groupMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/settings");
  revalidatePath("/teams");
}

export async function addMemberByUserId(
  groupId: string,
  userId: string,
  role: "MEMBER" | "ADMIN" | "GUEST" = "MEMBER"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.groupMember.create({
    data: {
      userId,
      groupId,
      role,
    },
  });

  revalidatePath("/teams");
  revalidatePath("/settings");
}
