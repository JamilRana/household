"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveGroupId } from "@/lib/actions/user";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ItemStatus } from "@prisma/client";
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

async function getOrCreateFinanceCategory(userId: string, categoryName?: string | null) {
  const name = categoryName || "Groceries";
  
  let category = await prisma.category.findFirst({
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

    category = await prisma.category.create({
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

  const activeGroupId = groupId !== undefined ? groupId : await getActiveGroupId(session.user.id);

  return await prisma.groceryList.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { groupId: activeGroupId || undefined },
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
          { groupId: groupId || undefined },
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
  listId: z.string(),
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default("piece"),
  category: z.string().optional(),
  estimatedPrice: z.number().optional(),
});

export async function addGroceryItem(values: z.infer<typeof CreateGroceryItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify user has access to this list
  const groupId = await getActiveGroupId(session.user.id);
  const list = await prisma.groceryList.findFirst({
    where: {
      id: values.listId,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId || undefined },
        { shares: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!list) throw new Error("Grocery list not found or access denied");

  const item = await prisma.groceryItem.create({
    data: {
      ...values,
      createdBy: session.user.id,
    },
  });

  revalidatePath(`/groceries/${values.listId}`);
  return {
    ...item,
    quantity: Number(item.quantity),
    estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
  };
}

export async function updateItemStatus(itemId: string, status: ItemStatus, actualPrice?: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: verify the item belongs to a list the user can access
  const groupId = await getActiveGroupId(session.user.id);
  const item = await prisma.groceryItem.findFirst({
    where: {
      id: itemId,
      list: {
        OR: [
          { ownerId: session.user.id },
          { groupId: groupId || undefined },
          { shares: { some: { userId: session.user.id } } },
        ],
      },
    },
  });

  if (!item) throw new Error("Item not found or access denied");

  const updated = await prisma.groceryItem.update({
    where: { id: itemId },
    data: { 
      status,
      purchasedAt: status === "PURCHASED" ? new Date() : null,
      purchasedBy: status === "PURCHASED" ? session.user.id : null,
      actualPrice: status === "PURCHASED" ? (actualPrice ?? (item.estimatedPrice ? Number(item.estimatedPrice) : null)) : null,
      estimatedPrice: status === "PURCHASED" ? (actualPrice ?? (item.estimatedPrice ? Number(item.estimatedPrice) : null)) : item.estimatedPrice,
    },
  });

  // Automatically sync to Pantry and Finance when item is marked as purchased (completed)
  if (status === "PURCHASED") {
    // 1. Add to Pantry (Dynamic Location and Expiry)
    const expiryDays = getDynamicExpiryDays(updated.category);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    const dynamicLocation = getDynamicLocation(updated.category);
    const categoryId = await findPantryCategoryByName(session.user.id, updated.category);

    await prisma.pantryItem.create({
      data: {
        name: updated.name,
        quantity: updated.quantity,
        unit: updated.unit,
        location: dynamicLocation,
        expiryDate,
        userId: session.user.id,
        groupId,
        categoryId,
      },
    });

    // 2. Add to Finance (Dynamic Transaction Category)
    const price = updated.actualPrice ? Number(updated.actualPrice) : 0;
    if (price > 0) {
      const financeCategory = await getOrCreateFinanceCategory(session.user.id, updated.category);
      const { encrypt } = await import("@/lib/encryption");

      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          groupId,
          type: "EXPENSE",
          amount: price,
          currency: "USD",
          categoryId: financeCategory.id,
          date: new Date(),
          description: `Purchased: ${updated.name}`,
          paymentMethod: "CASH",
          encryptedAmount: encrypt(price.toString()),
        },
      });
    }
  }

  // Notify group members when item purchased
  if (status === "PURCHASED" && groupId) {
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
        "Item Purchased",
        `${session.user.name || 'A member'} bought: ${updated.name}`
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

  const itemIds = Object.keys(itemPrices);
  if (itemIds.length === 0 && !manualTotal) return;

  const groupId = await getActiveGroupId(session.user.id);

  // Execute atomically in a single transaction with idempotency and duplicate pantry merging
  await prisma.$transaction(async (tx) => {
    // 1. Fetch pending items
    const items = await tx.groceryItem.findMany({
      where: {
        id: { in: itemIds },
        status: "PENDING",
      },
      include: { list: true },
    });

    // Idempotency: if already processed or empty, skip duplicate creation
    if (items.length === 0 && !manualTotal) {
      return;
    }

    // 2. Update item prices and mark as PURCHASED
    for (const item of items) {
      const price = itemPrices[item.id] ?? (item.estimatedPrice ? Number(item.estimatedPrice) : 0);
      await tx.groceryItem.update({
        where: { id: item.id },
        data: {
          actualPrice: price,
          status: "PURCHASED",
          purchasedAt: new Date(),
          purchasedBy: session.user!.id!,
        },
      });
    }

    // 3. Reconcile totals and create finance transactions
    const calculatedTotal = items.reduce((sum, item) => {
      const p = itemPrices[item.id] ?? (item.estimatedPrice ? Number(item.estimatedPrice) : 0);
      return sum + p;
    }, 0);

    const categoryTotals: Record<string, number> = {};
    for (const item of items) {
      const p = itemPrices[item.id] ?? (item.estimatedPrice ? Number(item.estimatedPrice) : 0);
      const cat = item.category || "Groceries";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + p;
    }

    // If manualTotal is specified (e.g. store receipt discrepancy, discounts, tax), scale proportionally
    const scaleFactor = calculatedTotal > 0 && manualTotal ? manualTotal / calculatedTotal : 1;

    let transactionCreated = false;
    for (const [catName, subtotal] of Object.entries(categoryTotals)) {
      const adjustedAmount = Math.round(subtotal * scaleFactor * 100) / 100;
      if (adjustedAmount > 0) {
        const financeCategory = await getOrCreateFinanceCategory(session.user!.id!, catName);
        const { encrypt } = await import("@/lib/encryption");

        await tx.transaction.create({
          data: {
            userId: session.user!.id!,
            groupId,
            type: "EXPENSE",
            amount: adjustedAmount,
            currency: "USD",
            categoryId: financeCategory.id,
            date: new Date(),
            description: `Shopping trip (${catName})`,
            paymentMethod: "CASH",
            encryptedAmount: encrypt(adjustedAmount.toFixed(2), session.user!.id!),
          },
        });
        transactionCreated = true;
      }
    }

    if (!transactionCreated && manualTotal && manualTotal > 0) {
      const financeCategory = await getOrCreateFinanceCategory(session.user!.id!, "Groceries");
      const { encrypt } = await import("@/lib/encryption");

      await tx.transaction.create({
        data: {
          userId: session.user!.id!,
          groupId,
          type: "EXPENSE",
          amount: manualTotal,
          currency: "USD",
          categoryId: financeCategory.id,
          date: new Date(),
          description: `Shopping trip`,
          paymentMethod: "CASH",
          encryptedAmount: encrypt(manualTotal.toFixed(2), session.user!.id!),
        },
      });
    }

    // 4. Pantry Ingestion with Duplicate Stock Merging
    for (const item of items) {
      const dynamicLocation = getDynamicLocation(item.category);
      const expiryDays = getDynamicExpiryDays(item.category);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const categoryId = await findPantryCategoryByName(session.user!.id!, item.category);

      // Check if item with matching name, unit, and location exists to merge quantity
      const existing = await tx.pantryItem.findFirst({
        where: {
          name: { equals: item.name, mode: "insensitive" },
          unit: item.unit,
          location: dynamicLocation,
          OR: [
            { userId: session.user!.id! },
            { groupId: groupId || undefined },
          ],
        },
      });

      if (existing) {
        await tx.pantryItem.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: item.quantity },
            expiryDate: existing.expiryDate && existing.expiryDate > expiryDate
              ? existing.expiryDate
              : expiryDate,
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
            userId: session.user!.id!,
            groupId,
            categoryId,
          },
        });
      }
    }
  });

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

  await prisma.pantryCategory.delete({
    where: { id, userId: session.user.id, isSystem: false },
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

  const category = await prisma.pantryCategory.update({
    where: { id, userId: session.user.id, isSystem: false },
    data: values,
  });

  revalidatePath("/pantry");
  revalidatePath("/settings");
  return category;
}

async function findPantryCategoryByName(userId: string, categoryName?: string | null) {
  if (!categoryName) return null;
  
  const category = await prisma.pantryCategory.findFirst({
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
        { groupId: groupId || undefined },
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
        { list: { groupId: groupId || undefined } },
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
        { groupId: groupId || undefined },
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
        { groupId: groupId || undefined },
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
        { groupId: groupId || undefined },
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
        { list: { groupId: groupId || undefined } },
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
        { list: { groupId: groupId || undefined } },
      ]
    },
  });

  if (!item) throw new Error("Item not found");

  const expiryDays = getDynamicExpiryDays(item.category);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  const dynamicLocation = location === "Pantry" ? getDynamicLocation(item.category) : location;

  const categoryId = await findPantryCategoryByName(session.user.id, item.category);

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
        { groupId: groupId || undefined },
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
        { groupId: groupId || undefined },
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
