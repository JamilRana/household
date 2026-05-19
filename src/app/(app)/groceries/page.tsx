import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShoppingBasket, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 h-[300px] w-[300px] bg-emerald-400/5 blur-[100px] rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-3xl shadow-inner border border-emerald-50 dark:border-emerald-800">
            <ShoppingBasket className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Groceries</h1>
            <p className="text-muted-foreground text-sm font-bold">Smart shopping for your home.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/groceries/shopping">
            <Button className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 gap-2 font-bold">
              <ShoppingCart className="size-4" />
              Start Shopping
            </Button>
          </Link>
          <CategoryManager initialCategories={categories} />
          <AddGroceryItemModal lists={lists} categories={categories} />
        </div>
      </div>

      <GroceryListWithFilters initialItems={groceryItems} />
    </div>
  );
}
