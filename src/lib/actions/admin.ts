"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = user?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");
  
  return session;
}

export async function getAllUsersAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = user?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");

  return await prisma.user.findMany({
    where: { deletedAt: null },
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
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserStats(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = user?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");

  const [taskCount, groceryCount, transactionCount, groupMemberships, recentActivity] = await Promise.all([
    prisma.task.count({ where: { createdBy: userId } }),
    prisma.groceryItem.count({ where: { createdBy: userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.task.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true }
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = user?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");

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
    },
    take: 10,
  });
}

export async function getUserGroupsAdmin(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = currentUser?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");

  return await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        select: { id: true, name: true, icon: true }
      }
    },
    orderBy: { joinedAt: "desc" },
  });
}

const DeactivateUserSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

export async function deactivateUser(values: z.infer<typeof DeactivateUserSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true }
  });

  const isAdmin = currentUser?.memberships.some(m => m.role === "OWNER" || m.role === "ADMIN");
  if (!isAdmin) throw new Error("Admin access required");

  await prisma.user.update({
    where: { id: values.userId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/admin/users");
}

// ─── User CRUD Operations ───

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function createUser(values: z.infer<typeof CreateUserSchema>) {
  await checkAdmin();

  const validated = CreateUserSchema.parse(values);

  const existing = await prisma.user.findUnique({
    where: { email: validated.email.toLowerCase() }
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
    },
  });

  revalidatePath("/admin/users");
  return { id: user.id, email: user.email, name: user.name };
}

const UpdateUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
});

export async function updateUser(values: z.infer<typeof UpdateUserSchema>) {
  await checkAdmin();

  const validated = UpdateUserSchema.parse(values);

  if (validated.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: validated.email.toLowerCase(),
        id: { not: validated.userId }
      }
    });
    if (existing) {
      throw new Error("Email already in use");
    }
  }

  await prisma.user.update({
    where: { id: validated.userId },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.email && { email: validated.email.toLowerCase() }),
    },
  });

  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await checkAdmin();

  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const session = await checkAdmin();

  if (session.user?.id === userId) {
    throw new Error("Cannot delete yourself");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
}

export async function reactivateUser(userId: string) {
  await checkAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });

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
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
  });
}