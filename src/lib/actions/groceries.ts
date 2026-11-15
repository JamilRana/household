"use server";

import { DEFAULT_CURRENCY } from "@/lib/format";
import { NO_GROUP, getWritableGroupId, onlyIfMember } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ItemStatus, Prisma } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import { requireGroupAccess } from "@/lib/permissions";

function getDynamicLocation(category?: string | null): string {
  const cat = (category || "").toLowerCase();
  if (
    cat.includes("fridge") || 
    cat.includes("dairy") || 
    cat.includes("milk") || 
    cat.includes("meat") || 
    cat.includes("fish") || 
    cat.includes("produce") || 
    cat.includes("fruit") || 
    cat.includes("veg") || 
    cat.includes("cheese") || 
    cat.includes("beverage") || 
    cat.includes("chilled")
  ) {
    return "Fridge";
  }
  if (cat.includes("freeze") || cat.includes("frozen") || cat.includes("ice")) {
    return "Freezer";
  }
  return "Pantry";
}

function getDynamicExpiryDays(category?: string | null): number {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dairy") || cat.includes("milk")) return 7;
  if (cat.includes("meat") || cat.includes("fish")) return 3;
  if (cat.includes("produce") || cat.includes("fruit") || cat.includes("veg")) return 5;
  if (cat.includes("bakery") || cat.includes("bread")) return 4;
  if (cat.includes("frozen")) return 90;
  if (cat.includes("canned") || cat.includes("dry")) return 365;
  return 14; // Default
}

// A client that is either the global prisma or an interactive-transaction client.
type Db = Prisma.TransactionClient;

function validPrice(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
    throw new Error("Invalid price");
  }
  return Math.round(v * 100) / 100;
}

async function getOrCreateFinanceCategory(db: Db, userId: string, categoryName?: string | null) {
  const name = categoryName || "Groceries";
  
  let category = await db.category.findFirst({
    where: {
      name,
      type: "EXPENSE",
      OR: [{ userId }, { isSystem: true }],
    },
  });

  if (!category) {
    let color = "#10B981"; // Default Groceries Emerald
    if (name !== "Groceries") {
      const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#EF4444", "#06B6D4"];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      color = colors[Math.abs(hash) % colors.length];
    }

    category = await db.category.create({
      data: {
        name,
        type: "EXPENSE",
        color,
        userId,
      },
    });
  }

  return category;
}

// --- Grocery List Actions ---

const CreateGroceryListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultStore: z.string().optional(),
});

export async function createGroceryList(values: z.infer<typeof CreateGroceryListSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const list = await prisma.groceryList.create({
    data: {
      ...values,
      ownerId: session.user.id,
      groupId,
    },
  });

  revalidatePath("/groceries");
  return list;
}

export async function getGroceryLists(groupId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const activeGroupId = groupId !== undefined ? await onlyIfMember(session.user.id, groupId) : await getActiveGroupId(session.user.id);

  return await prisma.groceryList.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId ?? NO_GROUP },
        { shares: { some: { userId: session.user.id } } },
      ],
      isArchived: false,
    },
    include: {
      _count: {
        select: { items: { where: { status: "PENDING" } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAllGroupGroceryItems() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const groupId = await getActiveGroupId(session.user.id);

  const items = await prisma.groceryItem.findMany({
    where: {
      status: "PENDING",
      list: {
        OR: [
          { ownerId: session.user.id },
          { groupId: groupId ?? NO_GROUP },
          { shares: { some: { userId: session.user.id } } },
        ],
      },
    },
    include: {
      list: true,
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });

  return items.map(item => ({
    ...item,
    quantity: Number(item.quantity),
    estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
  }));
}

// --- Grocery Item Actions ---

const CreateGroceryItemSchema = z.object({
  listId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default("pcs"),
  category: z.string().optional(),
  estimatedPrice: z.number().optional(),
});

const BatchCreateGroceryItemsSchema = z.object({
  listId: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().default(1),
      unit: z.string().default("pcs"),
      category: z.string().optional(),
      estimatedPrice: z.number().optional(),
    })
  ).min(1, "At least one item is required"),
});

export async function addGroceryItem(values: z.infer<typeof CreateGroceryItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const groupId = await getActiveGroupId(userId);
  let targetListId = values.listId?.trim();

  let list = targetListId
    ? await prisma.groceryList.findFirst({
        where: {
          id: targetListId,
          OR: [
            { ownerId: session.user.id },
            { groupId: groupId ?? NO_GROUP },
            { shares: { some: { userId: session.user.id } } },
          ],
        },
      })
    : null;

  if (!list) {
    list = await prisma.groceryList.findFirst({
      where: {
        OR: [
          { ownerId: session.user.id },
          { groupId: groupId ?? NO_GROUP },
          { shares: { some: { userId: session.user.id } } },
        ],
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!list) {
      list = await prisma.groceryList.create({
        data: {
          name: "My Shopping List",
          ownerId: session.user.id,
          groupId: groupId ?? null,
        },
      });
    }
  }

  const item = await prisma.groceryItem.create({
    data: {
      listId: list.id,
      name: values.name.trim(),
      quantity: values.quantity && values.quantity > 0 ? values.quantity : 1,
      unit: values.unit?.trim() || "pcs",
      category: values.category?.trim() || undefined,
      estimatedPrice: values.estimatedPrice ? Number(values.estimatedPrice) : undefined,
      createdBy: userId,
    },
  });

  revalidatePath("/groceries");
  revalidatePath(`/groceries/${list.id}`);
  revalidatePath("/dashboard");

  return {
    ...item,
    quantity: Number(item.quantity),
    estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
  };
}

export async function addGroceryItems(values: z.infer<typeof BatchCreateGroceryItemsSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const validItems = values.items
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
      unit: item.unit?.trim() || "pcs",
      category: item.category?.trim() || undefined,
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : undefined,
    }))
    .filter((item) => item.name.length > 0);

  if (validItems.length === 0) {
    throw new Error("Please enter at least one item name");
  }

  const groupId = await getActiveGroupId(session.user.id);
  let targetListId = values.listId?.trim();

  let list = targetListId
    ? await prisma.groceryList.findFirst({
        where: {
          id: targetListId,
          OR: [
            { ownerId: session.user.id },
            { groupId: groupId ?? NO_GROUP },
            { shares: { some: { userId: session.user.id } } },
          ],
        },
      })
    : null;

  if (!list) {
    list = await prisma.groceryList.findFirst({
      where: {
        OR: [
          { ownerId: session.user.id },
          { groupId: groupId ?? NO_GROUP },
          { shares: { some: { userId: session.user.id } } },
        ],
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!list) {
      list = await prisma.groceryList.create({
        data: {
          name: "My Shopping List",
          ownerId: session.user.id,
          groupId: groupId ?? null,
        },
      });
    }
  }

  const created = await prisma.$transaction(
    validItems.map((item) =>
      prisma.groceryItem.create({
        data: {
          listId: list.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          estimatedPrice: item.estimatedPrice,
          createdBy: userId,
        },
      })
    )
  );

  revalidatePath("/groceries");
  revalidatePath(`/groceries/${list.id}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    listId: list.id,
    listName: list.name,
    count: created.length,
    items: created.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
      actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
    })),
  };
}

export async function updateItemStatus(itemId: string, status: ItemStatus, actualPrice?: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify the item belongs to a list the user can access
  const groupId = await getActiveGroupId(session.user.id);
  const writableGroupId = await getWritableGroupId(session.user.id, groupId);
  const item = await prisma.groceryItem.findFirst({
    where: {
      id: itemId,
      list: {
        OR: [
          { ownerId: session.user.id },
          { groupId: writableGroupId ?? NO_GROUP },
          { shares: { some: { userId: session.user.id, role: { in: ["EDITOR", "ADMIN"] } } } },
        ],
      },
    },
  });

  if (!item) throw new Error("Item not found or access denied");

  const price = actualPrice !== undefined ? validPrice(actualPrice) : null;
  const alreadyPurchased = item.status === "PURCHASED";

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.groceryItem.update({
      where: { id: itemId },
      data: {
        status,
        purchasedAt: status === "PURCHASED" ? (alreadyPurchased ? item.purchasedAt : new Date()) : null,
        purchasedBy: status === "PURCHASED" ? (alreadyPurchased ? item.purchasedBy : session.user!.id!) : null,
        actualPrice:
          status === "PURCHASED"
            ? (price ?? (item.actualPrice ? Number(item.actualPrice) : item.estimatedPrice ? Number(item.estimatedPrice) : null))
            : null,
      },
    });

    // Idempotent: only the PENDING/UNAVAILABLE -> PURCHASED transition creates pantry + expense rows.
    if (status === "PURCHASED" && !alreadyPurchased) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + getDynamicExpiryDays(row.category));
      const categoryId = await findPantryCategoryByName(tx, session.user!.id!, row.category);

      await tx.pantryItem.create({
        data: {
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          location: getDynamicLocation(row.category),
          expiryDate,
          userId: session.user!.id!,
          groupId,
          categoryId,
        },
      });

      const amount = row.actualPrice ? Number(row.actualPrice) : 0;
      if (amount > 0) {
        const financeCategory = await getOrCreateFinanceCategory(tx, session.user!.id!, row.category);
        await tx.transaction.create({
          data: {
            userId: session.user!.id!,
            groupId,
            type: "EXPENSE",
            amount,
            currency: DEFAULT_CURRENCY,
            categoryId: financeCategory.id,
            date: new Date(),
            description: `Purchased: ${row.name}`,
            paymentMethod: "CASH",
            encryptedAmount: encrypt(amount.toFixed(2), session.user!.id!),
          },
        });
      }
    }

    return row;
  });

  // Notify group members when item purchased (first time only)
  if (status === "PURCHASED" && !alreadyPurchased && groupId) {
    const members = await prisma.groupMember.findMany({
      where: { 
        groupId,
        userId: { not: session.user.id }
      },
    });

    const { createNotification } = await import("@/lib/actions/notifications");
    for (const member of members) {
      await createNotification(
        member.userId,
        "ITEM_PURCHASED",
        "Picked up",
        `${session.user.name || "Someone"} bought ${updated.name}`
      );
    }
  }

  revalidatePath("/groceries");
  revalidatePath("/pantry");
  revalidatePath("/finance");
  return {
    ...updated,
    quantity: Number(updated.quantity),
    estimatedPrice: updated.estimatedPrice ? Number(updated.estimatedPrice) : null,
    actualPrice: updated.actualPrice ? Number(updated.actualPrice) : null,
  };
}

// --- Shopping Session ---

export async function finalizeShoppingSession(itemPrices: Record<string, number>, manualTotal?: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const itemIds = Object.keys(itemPrices);
  if (itemIds.length === 0 && !manualTotal) return;
  if (itemIds.length > 500) throw new Error("Too many items in one trip");

  // Validate every client-supplied number up front
  const prices: Record<string, number> = {};
  for (const id of itemIds) prices[id] = validPrice(itemPrices[id]);
  const total = manualTotal !== undefined && manualTotal !== null && manualTotal !== 0
    ? validPrice(manualTotal)
    : undefined;

  const groupId = await getActiveGroupId(userId);
  const writableGroupId = await getWritableGroupId(userId, groupId);

  await prisma.$transaction(
    async (tx) => {
      // 1. Only PENDING items on lists the user can WRITE to (owner, writable group, or editor share)
      const items = await tx.groceryItem.findMany({
        where: {
          id: { in: itemIds },
          status: "PENDING",
          list: {
            OR: [
              { ownerId: userId },
              { groupId: writableGroupId ?? NO_GROUP },
              { shares: { some: { userId, role: { in: ["EDITOR", "ADMIN"] } } } },
            ],
          },
        },
      });

      // Idempotency: nothing pending (double tap / already processed) => no duplicate expenses
      if (items.length === 0) return;

      const priceOf = (item: (typeof items)[number]) =>
        prices[item.id] ?? (item.estimatedPrice ? Number(item.estimatedPrice) : 0);

      // 2. Mark purchased (single round trip per item, all inside the transaction)
      const now = new Date();
      await Promise.all(
        items.map((item) =>
          tx.groceryItem.update({
            where: { id: item.id },
            data: { actualPrice: priceOf(item), status: "PURCHASED", purchasedAt: now, purchasedBy: userId },
          })
        )
      );

      // 3. Per-category subtotals in integer cents (no float drift)
      const centsByCategory: Record<string, number> = {};
      let calculatedCents = 0;
      for (const item of items) {
        const cents = Math.round(priceOf(item) * 100);
        const cat = item.category || "Groceries";
        centsByCategory[cat] = (centsByCategory[cat] || 0) + cents;
        calculatedCents += cents;
      }

      // Receipt total differs (tax, bag fee, coupon): scale proportionally, push the rounding
      // remainder onto the largest category so the sum matches the receipt exactly.
      const targetCents = total !== undefined && calculatedCents > 0 ? Math.round(total * 100) : calculatedCents;
      const entries = Object.entries(centsByCategory);
      let allocated = 0;
      const scaled = entries.map(([cat, cents]) => {
        const v = calculatedCents > 0 ? Math.round((cents * targetCents) / calculatedCents) : 0;
        allocated += v;
        return [cat, v] as [string, number];
      });
      if (scaled.length > 0 && allocated !== targetCents) {
        let big = 0;
        scaled.forEach(([, v], i) => { if (v > scaled[big][1]) big = i; });
        scaled[big][1] += targetCents - allocated;
      }

      let created = false;
      for (const [catName, cents] of scaled) {
        if (cents <= 0) continue;
        const amount = cents / 100;
        const financeCategory = await getOrCreateFinanceCategory(tx, userId, catName);
        await tx.transaction.create({
          data: {
            userId,
            groupId: writableGroupId,
            type: "EXPENSE",
            amount,
            currency: DEFAULT_CURRENCY,
            categoryId: financeCategory.id,
            date: now,
            description: `Shopping trip (${catName})`,
            paymentMethod: "CASH",
            encryptedAmount: encrypt(amount.toFixed(2), userId),
          },
        });
        created = true;
      }

      if (!created && total && total > 0) {
        const financeCategory = await getOrCreateFinanceCategory(tx, userId, "Groceries");
        await tx.transaction.create({
          data: {
            userId,
            groupId: writableGroupId,
            type: "EXPENSE",
            amount: total,
            currency: DEFAULT_CURRENCY,
            categoryId: financeCategory.id,
            date: now,
            description: "Shopping trip",
            paymentMethod: "CASH",
            encryptedAmount: encrypt(total.toFixed(2), userId),
          },
        });
      }

      // 4. Pantry ingestion with duplicate-stock merging
      for (const item of items) {
        const dynamicLocation = getDynamicLocation(item.category);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + getDynamicExpiryDays(item.category));
        const categoryId = await findPantryCategoryByName(tx, userId, item.category);

        const existing = await tx.pantryItem.findFirst({
          where: {
            name: { equals: item.name, mode: "insensitive" },
            unit: item.unit,
            location: dynamicLocation,
            OR: [{ userId }, { groupId: writableGroupId ?? NO_GROUP }],
          },
        });

        if (existing) {
          await tx.pantryItem.update({
            where: { id: existing.id },
            data: {
              quantity: { increment: item.quantity },
              expiryDate: existing.expiryDate && existing.expiryDate > expiryDate ? existing.expiryDate : expiryDate,
            },
          });
        } else {
          await tx.pantryItem.create({
            data: {
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              location: dynamicLocation,
              expiryDate,
              userId,
              groupId: writableGroupId,
              categoryId,
            },
          });
        }
      }
    },
    { maxWait: 10_000, timeout: 30_000 }
  );

  revalidatePath("/finance");
  revalidatePath("/groceries");
  revalidatePath("/pantry");
}

// --- Pantry Category Actions ---

export async function getPantryCategories() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Check if there are any system categories
  let systemCats = await prisma.pantryCategory.findMany({
    where: { isSystem: true },
  });

  if (systemCats.length === 0) {
    const defaultPantryCategories = [
      { name: "Produce", color: "#10B981" },
      { name: "Dairy", color: "#3B82F6" },
      { name: "Meat & Seafood", color: "#EF4444" },
      { name: "Bakery", color: "#F59E0B" },
      { name: "Frozen Foods", color: "#06B6D4" },
      { name: "Canned Goods", color: "#8B5CF6" },
      { name: "Dry Goods & Pasta", color: "#EC4899" },
      { name: "Snacks", color: "#14B8A6" },
      { name: "Beverages", color: "#6366F1" },
      { name: "Condiments & Sauces", color: "#F97316" },
      { name: "Spices & Baking", color: "#64748B" },
      { name: "Household & Cleaning", color: "#475569" },
      { name: "Other", color: "#94A3B8" }
    ];

    await prisma.pantryCategory.createMany({
      data: defaultPantryCategories.map(cat => ({
        name: cat.name,
        color: cat.color,
        isSystem: true,
      })),
    });
  }

  return await prisma.pantryCategory.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { isSystem: true },
      ],
    },
    orderBy: { name: "asc" },
  });
}

const CreatePantryCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().default("#10B981"),
});

export async function createPantryCategory(values: z.infer<typeof CreatePantryCategorySchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const category = await prisma.pantryCategory.create({
    data: {
      ...values,
      userId: session.user.id,
    },
  });

  revalidatePath("/pantry");
  revalidatePath("/settings");
  return category;
}

export async function deletePantryCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.pantryItem.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  const owned = await prisma.pantryCategory.findFirst({
    where: { id, userId: session.user.id, isSystem: false },
    select: { id: true },
  });

  if (!owned) {
    const sys = await prisma.pantryCategory.findFirst({
      where: { id, isSystem: true },
      select: { id: true },
    });
    if (!sys) throw new Error("Category not found or cannot be deleted");
    await prisma.pantryCategory.delete({ where: { id } });
    revalidatePath("/pantry");
    revalidatePath("/settings");
    return;
  }

  await prisma.pantryCategory.delete({
    where: { id },
  });

  revalidatePath("/pantry");
  revalidatePath("/settings");
}

const UpdatePantryCategorySchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().optional(),
});

export async function updatePantryCategory(id: string, values: z.infer<typeof UpdatePantryCategorySchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const owned = await prisma.pantryCategory.findFirst({
    where: { id, userId: session.user.id, isSystem: false },
    select: { id: true },
  });

  if (!owned) {
    const sys = await prisma.pantryCategory.findFirst({
      where: { id, isSystem: true },
      select: { id: true },
    });
    if (!sys) throw new Error("Category not found or cannot be edited");
    const category = await prisma.pantryCategory.update({
      where: { id },
      data: values,
    });
    revalidatePath("/pantry");
    revalidatePath("/settings");
    return category;
  }

  const category = await prisma.pantryCategory.update({
    where: { id },
    data: values,
  });

  revalidatePath("/pantry");
  revalidatePath("/settings");
  return category;
}

async function findPantryCategoryByName(db: Db, userId: string, categoryName?: string | null) {
  if (!categoryName) return null;
  
  const category = await db.pantryCategory.findFirst({
    where: {
      name: {
        equals: categoryName,
        mode: "insensitive"
      },
      OR: [{ userId }, { isSystem: true }],
    },
  });

  return category?.id || null;
}

// --- Pantry Actions ---

export async function getPantryItems() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const groupId = await getActiveGroupId(session.user.id);

  const items = await prisma.pantryItem.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
      ],
    },
    include: {
      category: true,
    },
    orderBy: { expiryDate: "asc" },
  });

  return items.map(item => ({
    ...item,
    quantity: Number(item.quantity),
  }));
}

const CreatePantryItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default("piece"),
  location: z.string().default("Pantry"),
  expiryDate: z.date().optional(),
  categoryId: z.string().nullable().optional(),
});

export async function addPantryItem(values: z.infer<typeof CreatePantryItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const item = await prisma.pantryItem.create({
    data: {
      ...values,
      userId: session.user.id,
      groupId,
    },
  });

  revalidatePath("/pantry");
  return {
    ...item,
    quantity: Number(item.quantity),
  };
}

export async function deleteGroceryItem(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify ownership via list access
  const groupId = await getActiveGroupId(session.user.id);

  await prisma.groceryItem.deleteMany({
    where: { 
      id,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId ?? NO_GROUP } },
        { list: { shares: { some: { userId: session.user.id } } } },
      ]
    },
  });

  revalidatePath("/groceries");
}

export async function deletePantryItem(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: only the creator or group members can delete
  const groupId = await getActiveGroupId(session.user.id);

  await prisma.pantryItem.deleteMany({
    where: { 
      id,
      OR: [
        { userId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
      ],
    },
  });

  revalidatePath("/pantry");
}

export async function updatePantryItem(id: string, values: Partial<z.infer<typeof CreatePantryItemSchema>>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify access
  const groupId = await getActiveGroupId(session.user.id);
  const existing = await prisma.pantryItem.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
      ],
    },
  });

  if (!existing) throw new Error("Item not found or access denied");

  const item = await prisma.pantryItem.update({
    where: { id },
    data: values,
  });

  revalidatePath("/pantry");
  return {
    ...item,
    quantity: Number(item.quantity),
  };
}

export async function consumePantryItem(id: string, amount: number = 1) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);
  const existing = await prisma.pantryItem.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
      ],
    },
  });

  if (!existing) throw new Error("Item not found or access denied");

  const newQty = Number(existing.quantity) - amount;

  if (newQty <= 0) {
    await prisma.pantryItem.delete({
      where: { id },
    });
  } else {
    await prisma.pantryItem.update({
      where: { id },
      data: { quantity: newQty },
    });
  }

  revalidatePath("/pantry");
  
  return {
    deleted: newQty <= 0,
    newQuantity: Math.max(0, newQty),
  };
}

export async function renameCategory(oldName: string, newName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  await prisma.groceryItem.updateMany({
    where: { 
      category: oldName,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId ?? NO_GROUP } },
      ]
    },
    data: { category: newName }
  });

  revalidatePath("/groceries");
}

export async function moveItemToPantry(itemId: string, location: string = "Pantry") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const item = await prisma.groceryItem.findFirst({
    where: { 
      id: itemId,
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId ?? NO_GROUP } },
      ]
    },
  });

  if (!item) throw new Error("Item not found");

  const expiryDays = getDynamicExpiryDays(item.category);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  const dynamicLocation = location === "Pantry" ? getDynamicLocation(item.category) : location;

  const categoryId = await findPantryCategoryByName(prisma, session.user.id, item.category);

  await prisma.pantryItem.create({
    data: {
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: dynamicLocation,
      expiryDate,
      userId: session.user.id,
      groupId,
      categoryId,
    },
  });

  await prisma.groceryItem.update({
    where: { id: itemId },
    data: { 
      status: "PURCHASED",
      purchasedAt: new Date(),
      purchasedBy: session.user.id
    },
  });

  revalidatePath("/groceries");
  revalidatePath("/pantry");
}

// Legacy alias
export const getAllHouseholdGroceryItems = getAllGroupGroceryItems;

export async function deleteGroceryList(listId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const list = await prisma.groceryList.findFirst({
    where: {
      id: listId,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
      ],
    },
  });

  if (!list) throw new Error("Grocery list not found or access denied");

  await prisma.groceryItem.deleteMany({
    where: { listId },
  });

  await prisma.share.deleteMany({
    where: { resourceType: "GROCERY_LIST", resourceId: listId },
  });

  await prisma.groceryList.delete({
    where: { id: listId },
  });

  revalidatePath("/groceries");
}

const UpdateGroceryListSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  defaultStore: z.string().optional(),
});

export async function updateGroceryList(values: z.infer<typeof UpdateGroceryListSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const groupId = await getActiveGroupId(session.user.id);

  const list = await prisma.groceryList.findFirst({
    where: {
      id: values.id,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
        { shares: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!list) throw new Error("Grocery list not found or access denied");

  const updated = await prisma.groceryList.update({
    where: { id: values.id },
    data: {
      name: values.name,
      description: values.description,
      defaultStore: values.defaultStore,
    },
  });

  revalidatePath(`/groceries/${values.id}`);
  revalidatePath("/groceries");
  return updated;
}
