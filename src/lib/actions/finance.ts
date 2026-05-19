"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TransactionType, PaymentMethod, BudgetPeriod } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/encryption";
import { startOfMonth, endOfMonth, format } from "date-fns";

// --- Category Actions ---

export async function getCategories() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.category.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { isSystem: true },
      ],
      isArchived: false,
    },
    orderBy: { name: "asc" },
  });
}

const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(TransactionType),
  color: z.string().default("#3B82F6"),
});

export async function createCategory(values: z.infer<typeof CreateCategorySchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await prisma.category.create({
    data: {
      ...values,
      userId: session.user.id,
    },
  });

  revalidatePath("/finance");
  return category;
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/finance");
}

const UpdateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().optional(),
});

export async function updateCategory(id: string, values: z.infer<typeof UpdateCategorySchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await prisma.category.update({
    where: { id },
    data: values,
  });

  revalidatePath("/finance");
  revalidatePath("/groceries");
  return category;
}

// --- Transaction Actions ---

const CreateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  categoryId: z.string(),
  date: z.date(),
  description: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
});

export async function createTransaction(values: z.infer<typeof CreateTransactionSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { amount, ...rest } = values;
  
  // Encrypt the amount for storage
  const encryptedAmount = encrypt(amount.toString());

  const groupId = await getActiveGroupId(session.user.id);

  const transaction = await prisma.transaction.create({
    data: {
      ...rest,
      amount: amount,
      encryptedAmount: encryptedAmount,
      userId: session.user.id,
      groupId,
    },
  });

  revalidatePath("/finance");
  return transaction;
}

export async function getTransactions(options: {
  cursor?: string;
  take?: number;
  type?: TransactionType;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
} = {}) {
  const { cursor, take = 50, type, categoryId, startDate, endDate, search } = options;
  const session = await auth();
  if (!session?.user?.id) return [];

  const groupId = await getActiveGroupId(session.user.id);

  const transactions = await prisma.transaction.findMany({
    where: {
      AND: [
        {
          OR: [
            { userId: session.user.id },
            { groupId: groupId || undefined },
          ],
        },
        type ? { type } : {},
        categoryId ? { categoryId } : {},
        startDate || endDate ? {
          date: {
            gte: startDate || undefined,
            lte: endDate || undefined,
          },
        } : {},
        search ? {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        } : {},
      ],
    },
    include: { category: true },
    orderBy: { date: "desc" },
    take,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
  });

  return transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
  }));
}

// --- Budget Actions ---

export async function getBudgets() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const groupId = await getActiveGroupId(userId);

  const budgets = await prisma.budget.findMany({
    where: {
      OR: [
        { userId: userId },
        { groupId: groupId || undefined },
      ],
    },
    include: { category: true },
  });

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const result = await prisma.transaction.aggregate({
        where: {
          categoryId: budget.categoryId,
          type: "EXPENSE",
          date: {
            gte: budget.startDate,
            lte: budget.endDate || undefined,
          },
          OR: [
            { userId: userId },
            { groupId: groupId || undefined },
          ],
        },
        _sum: {
          amount: true,
        },
      });

      return {
        ...budget,
        amount: Number(budget.amount),
        spent: Number(result._sum.amount || 0),
      };
    })
  );

  return budgetsWithSpent;
}

// --- New Actions ---

const CreateBudgetSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  period: z.nativeEnum(BudgetPeriod).default(BudgetPeriod.MONTHLY),
  startDate: z.date().default(new Date()),
});

export async function createBudget(values: z.infer<typeof CreateBudgetSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const budget = await prisma.budget.create({
    data: {
      ...values,
      userId: session.user.id,
      groupId,
    },
  });

  revalidatePath("/finance");
  return budget;
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.transaction.delete({
    where: {
      id,
      userId: session.user.id,
    },
  });

  revalidatePath("/finance");
}

export async function deleteBudget(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.budget.delete({
    where: {
      id,
      userId: session.user.id,
    },
  });

  revalidatePath("/finance");
}

export async function processRecurringTransactions() {
  const recurringTransactions = await prisma.transaction.findMany({
    where: {
      isRecurring: true,
      recurrencePattern: { not: null },
    },
  });

  const now = new Date();
  let createdCount = 0;

  for (const tx of recurringTransactions) {
    if (!tx.recurrencePattern) continue;

    const lastOccurrence = tx.date;
    let nextDate = new Date(lastOccurrence);

    if (tx.recurrencePattern === "DAILY") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (tx.recurrencePattern === "WEEKLY") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (tx.recurrencePattern === "MONTHLY") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    if (nextDate <= now) {
      // Duplicate prevention
      const existing = await prisma.transaction.findFirst({
        where: {
          userId: tx.userId,
          categoryId: tx.categoryId,
          date: nextDate,
          amount: tx.amount,
          type: tx.type,
        },
      });

      if (existing) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { date: nextDate },
        });
        continue;
      }

      await prisma.transaction.create({
        data: {
          userId: tx.userId,
          groupId: tx.groupId,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          categoryId: tx.categoryId,
          date: nextDate,
          description: tx.description,
          paymentMethod: tx.paymentMethod,
          isRecurring: true,
          recurrencePattern: tx.recurrencePattern,
          encryptedAmount: tx.encryptedAmount,
        },
      });

      await prisma.transaction.update({
        where: { id: tx.id },
        data: { date: nextDate },
      });
      
      createdCount++;
    }
  }

  return { createdCount };
}

export async function getFinanceStats() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const groupId = await getActiveGroupId(userId);

  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [currentTransactions, lastMonthTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        OR: [
          { userId: userId },
          { groupId: groupId || undefined },
        ],
        date: { gte: currentStart, lte: currentEnd },
      },
    }),
    prisma.transaction.findMany({
      where: {
        OR: [
          { userId: userId },
          { groupId: groupId || undefined },
        ],
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
  ]);

  const calculateTotals = (txs: any[]) => {
    const income = txs.filter(t => t.type === "INCOME").reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  };

  const current = calculateTotals(currentTransactions);
  const last = calculateTotals(lastMonthTransactions);

  const calculateDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    current,
    last,
    deltas: {
      income: calculateDelta(current.income, last.income),
      expense: calculateDelta(current.expense, last.expense),
      balance: calculateDelta(current.balance, last.balance),
    },
  };
}

export async function getMonthlyBreakdown() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const groupId = await getActiveGroupId(userId);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { userId: userId },
        { groupId: groupId || undefined },
      ],
    },
    select: {
      type: true,
      amount: true,
      date: true,
    },
    orderBy: { date: "desc" },
  });

  const breakdown: Record<string, { income: number; expense: number; balance: number; year: number; month: string }> = {};

  for (const t of transactions) {
    const d = new Date(t.date);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    if (!breakdown[monthKey]) {
      breakdown[monthKey] = {
        income: 0,
        expense: 0,
        balance: 0,
        year,
        month: format(d, "MMMM"),
      };
    }

    const amt = Number(t.amount);
    if (t.type === "INCOME") {
      breakdown[monthKey].income += amt;
    } else if (t.type === "EXPENSE") {
      breakdown[monthKey].expense += amt;
    }
  }

  return Object.entries(breakdown)
    .map(([key, data]) => ({
      key,
      ...data,
      balance: data.income - data.expense,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}
