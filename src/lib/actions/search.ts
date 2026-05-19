"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";

export async function globalSearch(query: string) {
  const session = await auth();
  if (!session?.user?.id) return { tasks: [], groceries: [], pantry: [], transactions: [] };

  if (!query || query.length < 2) {
    return { tasks: [], groceries: [], pantry: [], transactions: [] };
  }

  const groupId = await getActiveGroupId();

  const [tasks, groceries, pantry, transactions] = await Promise.all([
    // Search Tasks
    prisma.task.findMany({
      where: {
        title: { contains: query, mode: "insensitive" },
        list: {
          OR: [
            { ownerId: session.user.id },
            { groupId: groupId || undefined },
          ],
        },
      },
      take: 5,
      include: { list: true },
    }),

    // Search Groceries
    prisma.groceryItem.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        list: {
          OR: [
            { ownerId: session.user.id },
            { groupId: groupId || undefined },
          ],
        },
      },
      take: 5,
      include: { list: true },
    }),

    // Search Pantry
    prisma.pantryItem.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        OR: [
          { userId: session.user.id },
          { groupId: groupId || undefined },
        ],
      },
      take: 5,
    }),

    // Search Transactions (Decryption happens client-side or we skip amount search)
    prisma.transaction.findMany({
      where: {
        description: { contains: query, mode: "insensitive" },
        OR: [
          { userId: session.user.id },
          { groupId: groupId || undefined },
        ],
      },
      take: 5,
      include: { category: true },
    }),
  ]);

  return {
    tasks,
    groceries: groceries.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
      actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
    })),
    pantry: pantry.map(item => ({
      ...item,
      quantity: Number(item.quantity),
    })),
    transactions: transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
    })),
  };
}
