import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { Recurrence } from "@prisma/client";

function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * Calculates the next occurrence date preserving month-end anchors
 * (e.g. Jan 31 -> Feb 28/29 -> Mar 31).
 */
export function calculateNextOccurrence(
  currentDate: Date,
  frequency: Recurrence,
  anchorDay?: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;

    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;

    case "MONTHLY": {
      const targetMonth = next.getMonth() + 1;
      const targetYear = next.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const targetAnchorDay = anchorDay ?? next.getDate();
      const maxDays = getDaysInMonth(targetYear, normalizedMonth);
      const day = Math.min(targetAnchorDay, maxDays);

      next.setFullYear(targetYear, normalizedMonth, day);
      break;
    }

    default:
      next.setDate(next.getDate() + 1);
      break;
  }

  return next;
}

/**
 * Robust, idempotent background worker for processing recurring rules.
 * Automatically catches up on all missed intervals since last execution.
 */
export async function processRecurringTransactions() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let createdCount = 0;

  // 1. RecurringRule model processing (idempotent, ruleId + occurrenceDate unique)
  let activeRules: any[] = [];
  try {
    if (prisma.recurringRule && typeof prisma.recurringRule.findMany === "function") {
      activeRules = (await prisma.recurringRule.findMany({
        where: {
          isActive: true,
          nextRunDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        include: {
          category: true,
        },
      })) || [];
    }
  } catch {
    activeRules = [];
  }

  for (const rule of activeRules) {
    const anchorDay = new Date(rule.startDate).getDate();
    let occurrence = new Date(rule.nextRunDate);

    // Loop until caught up to current date (or endDate reached)
    while (occurrence <= now && (!rule.endDate || occurrence <= rule.endDate)) {
      const occurrenceCopy = new Date(occurrence);
      occurrenceCopy.setHours(0, 0, 0, 0);

      try {
        await prisma.$transaction(async (tx: any) => {
          // Check if already created for this exact rule and occurrence date
          const existing = await tx.transaction.findUnique({
            where: {
              recurringRuleId_occurrenceDate: {
                recurringRuleId: rule.id,
                occurrenceDate: occurrenceCopy,
              },
            },
          });

          if (!existing) {
            const encryptedAmt = encrypt(rule.amount.toString(), rule.userId);

            await tx.transaction.create({
              data: {
                userId: rule.userId,
                groupId: rule.groupId,
                type: rule.type,
                amount: rule.amount,
                currency: rule.currency,
                categoryId: rule.categoryId,
                date: occurrenceCopy,
                description: rule.description || `Recurring: ${rule.category?.name || 'Expense'}`,
                paymentMethod: rule.paymentMethod,
                isRecurring: true,
                recurrencePattern: rule.frequency,
                recurringRuleId: rule.id,
                occurrenceDate: occurrenceCopy,
                encryptedAmount: encryptedAmt,
              },
            });

            createdCount++;
          }
        });
      } catch (err: any) {
        // Unique constraint violation P2002 means another runner processed it concurrently
        if (err.code !== "P2002") {
          console.error(`Error processing recurring rule ${rule.id}:`, err);
        }
      }

      // Advance occurrence to next cycle
      occurrence = calculateNextOccurrence(occurrence, rule.frequency, anchorDay);
    }

    // Update rule state with latest scheduled run
    const isCompleted = rule.endDate && occurrence > rule.endDate;
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: {
        lastRunDate: new Date(),
        nextRunDate: occurrence,
        isActive: !isCompleted,
      },
    });
  }

  // 2. Legacy fallback processing
  let legacyTxs: any[] = [];
  try {
    legacyTxs = (await prisma.transaction.findMany({
      where: {
        isRecurring: true,
        recurrencePattern: { not: null },
      },
    })) || [];
  } catch {
    legacyTxs = [];
  }

  for (const tx of legacyTxs) {
    if (!tx.recurrencePattern) continue;

    const lastOccurrence = tx.date || tx.nextOccurrence || new Date();
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

  return { createdCount, rulesProcessed: activeRules.length + legacyTxs.length };
}
