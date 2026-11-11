"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

export async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });

  if (!user || user.deletedAt || !user.isActive) {
    throw new Error("Account is inactive or disabled");
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
  if (!isAdmin) {
    throw new Error("Superadmin / Admin access required");
  }

  return { session, user };
}

export async function getAllUsersAdmin() {
  await checkAdmin();

  return await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          tasks: true,
          groceryItems: true,
          transactions: true,
          pantryItems: true,
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserStats(userId: string) {
  await checkAdmin();

  const [taskCount, groceryCount, transactionCount, groupMemberships, recentActivity] = await Promise.all([
    prisma.task.count({ where: { createdBy: userId } }),
    prisma.groceryItem.count({ where: { createdBy: userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.task.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  return {
    tasks: taskCount,
    groceries: groceryCount,
    transactions: transactionCount,
    groups: groupMemberships,
    recentActivity,
  };
}

export async function searchUsers(query: string) {
  await checkAdmin();

  return await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
    take: 10,
  });
}

export async function getUserGroupsAdmin(userId: string) {
  await checkAdmin();

  return await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        select: { id: true, name: true, icon: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}

const DeactivateUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().optional(),
});

export async function deactivateUser(values: z.infer<typeof DeactivateUserSchema>) {
  const { session } = await checkAdmin();
  const validated = DeactivateUserSchema.parse(values);

  if (session.user?.id === validated.userId) {
    throw new Error("Cannot deactivate your own account");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: validated.userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user!.id!,
        action: "DEACTIVATE_USER",
        resourceType: "USER",
        resourceId: validated.userId,
        changes: { reason: validated.reason || "Administrative deactivation" },
      },
    }),
  ]);

  revalidatePath("/admin/users");
}

export async function reactivateUser(userId: string) {
  const { session } = await checkAdmin();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        isActive: true,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user!.id!,
        action: "REACTIVATE_USER",
        resourceType: "USER",
        resourceId: userId,
      },
    }),
  ]);

  revalidatePath("/admin/users");
}

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password cannot exceed 72 bytes"),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional().default("USER"),
});

export async function createUser(values: z.input<typeof CreateUserSchema>) {
  const { session } = await checkAdmin();
  const validated = CreateUserSchema.parse(values);

  const existing = await prisma.user.findUnique({
    where: { email: validated.email.toLowerCase() },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(validated.password, 12);

  const user = await prisma.user.create({
    data: {
      email: validated.email.toLowerCase(),
      name: validated.name,
      password: hashedPassword,
      role: validated.role,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user!.id!,
      action: "CREATE",
      resourceType: "USER",
      resourceId: user.id,
      changes: { email: user.email, name: user.name, role: user.role },
    },
  });

  revalidatePath("/admin/users");
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

const UpdateUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional(),
});

export async function updateUser(values: z.infer<typeof UpdateUserSchema>) {
  const { session } = await checkAdmin();
  const validated = UpdateUserSchema.parse(values);

  if (validated.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: validated.email.toLowerCase(),
        id: { not: validated.userId },
      },
    });
    if (existing) {
      throw new Error("Email already in use");
    }
  }

  const updated = await prisma.user.update({
    where: { id: validated.userId },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.email && { email: validated.email.toLowerCase() }),
      ...(validated.role && { role: validated.role }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user!.id!,
      action: "UPDATE",
      resourceType: "USER",
      resourceId: updated.id,
      changes: validated,
    },
  });

  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const { session } = await checkAdmin();

  if (newPassword.length < 10 || newPassword.length > 72) {
    throw new Error("Password must be between 10 and 72 characters");
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.user!.id!,
        action: "PASSWORD_RESET",
        resourceType: "USER",
        resourceId: userId,
      },
    }),
  ]);

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const { session } = await checkAdmin();

  if (session.user?.id === userId) {
    throw new Error("Cannot delete your own account");
  }

  // relationMode="prisma" manual cascade cleanup
  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        userId: session.user!.id!,
        action: "DELETE",
        resourceType: "USER",
        resourceId: userId,
      },
    }),
    prisma.taskAssignment.deleteMany({ where: { userId } }),
    prisma.taskComment.deleteMany({ where: { userId } }),
    prisma.share.deleteMany({ where: { OR: [{ userId }, { invitedBy: userId }] } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.groupMember.deleteMany({ where: { userId } }),
    prisma.pantryItem.deleteMany({ where: { userId } }),
    prisma.groceryItem.deleteMany({ where: { createdBy: userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.task.deleteMany({ where: { createdBy: userId } }),
    prisma.taskList.deleteMany({ where: { ownerId: userId } }),
    prisma.groceryList.deleteMany({ where: { ownerId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  revalidatePath("/admin/users");
}

export async function getDeactivatedUsers() {
  await checkAdmin();

  return await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
  });
}
