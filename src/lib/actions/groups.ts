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

  revalidatePath("/settings");
  revalidatePath("/teams");
  return group;
}

export async function generateInvitation(groupId: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify permissions
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new Error("Only owners and admins can invite members");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const invitation = await prisma.groupInvitation.create({
    data: {
      email,
      token,
      expires,
      groupId,
      inviterId: session.user.id,
    },
  });

  revalidatePath("/settings");
  return invitation;
}

export async function acceptInvitation(token: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");

  const invitation = await prisma.groupInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expires < new Date()) {
    throw new Error("Invalid or expired invitation");
  }

  if (invitation.email !== session.user.email) {
    throw new Error("This invitation was sent to a different email address");
  }

  await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        userId: session.user.id,
        groupId: invitation.groupId,
        role: "MEMBER",
      },
    }),
    prisma.groupInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  revalidatePath("/settings");
}

export async function renameGroup(id: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.group.update({
    where: { id, ownerId: session.user.id },
    data: { name },
  });

  revalidatePath("/settings");
}

export async function leaveGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (membership?.role === "OWNER") {
    throw new Error("Owners cannot leave. Transfer ownership or delete the group instead.");
  }

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  revalidatePath("/settings");
}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId, ownerId: session.user.id },
  });

  if (!group) throw new Error("Group not found or you are not the owner");

  await prisma.group.delete({
    where: { id: groupId },
  });

  revalidatePath("/settings");
}

export async function updateMemberRole(groupId: string, memberId: string, role: "ADMIN" | "MEMBER" | "GUEST") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { role },
  });

  revalidatePath("/settings");
}

export async function transferOwnership(groupId: string, newOwnerId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const group = await prisma.group.findUnique({
    where: { id: groupId, ownerId: session.user.id },
  });

  if (!group) throw new Error("Unauthorized");

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
  ]);

  revalidatePath("/settings");
}

export async function updateGroupDetails(id: string, data: { name?: string; description?: string; icon?: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.group.update({
    where: { id },
    data,
  });

  revalidatePath("/settings");
}

export async function removeMember(groupId: string, memberId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.groupMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/settings");
}

export async function addMemberByUserId(groupId: string, userId: string, role: "MEMBER" | "ADMIN" | "GUEST" = "MEMBER") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const callerMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } }
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
