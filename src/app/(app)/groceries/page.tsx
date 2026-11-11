import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  ShoppingBasket, 
  ShoppingCart, 
  Plus, 
  Layers 
} from "lucide-react";
import Link from "next/link";
import { getGroceryLists } from "@/lib/actions/groceries";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { CategoryManager } from "@/components/groceries/CategoryManager";
import { getActiveGroupId } from "@/lib/actions/user";
import { GroceryListWithFilters } from "@/components/groceries/GroceryListWithFilters";

export default async function GroceriesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const groupId = await getActiveGroupId(session.user.id);
  const lists = await getGroceryLists(groupId);

  const categories = await prisma.category.findMany({
    where: {
      type: "EXPENSE",
      OR: [
        { userId: session.user.id },
        { isSystem: true }
      ]
    },
    orderBy: { name: "asc" }
  });

  const rawGroceryItems = await prisma.groceryItem.findMany({
    where: {
      OR: [
        { createdBy: session.user.id },
        { list: { ownerId: session.user.id } },
        { list: { groupId: groupId || undefined } },
        { list: { shares: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      list: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const groceryItems = rawGroceryItems.map(item => ({
    ...item,
    quantity: Number(item.quantity),
    estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
  }));

  const pendingCount = groceryItems.filter(i => i.status === "PENDING").length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Groceries
          </h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount === 0 ? "Shopping list is empty." : `${pendingCount} item${pendingCount > 1 ? "s" : ""} to buy.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/groceries/shopping"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-card hover:bg-muted/60 transition-colors"
          >
            <ShoppingCart className="size-3.5" />
            <span>Shopping mode</span>
          </Link>
          <CategoryManager initialCategories={categories} />
          <AddGroceryItemModal lists={lists} categories={categories} />
        </div>
      </header>

      {/* Grocery Items List */}
      <section className="bg-card border border-border rounded-xl p-4">
        <GroceryListWithFilters 
          initialItems={groceryItems} 
        />
      </section>
    </div>
  );
}
