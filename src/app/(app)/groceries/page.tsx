import { redirect } from "next/navigation";
import { NO_GROUP } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  ShoppingBasket, 
  ShoppingCart, 
  Plus, 
  CheckCircle2,
  FolderKanban
} from "lucide-react";
import Link from "next/link";
import { getGroceryLists } from "@/lib/actions/groceries";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { QuickAddGroceryBar } from "@/components/groceries/QuickAddGroceryBar";
import { CategoryManager } from "@/components/groceries/CategoryManager";
import { getActiveGroupId } from "@/lib/actions/user";
import { GroceryListWithFilters } from "@/components/groceries/GroceryListWithFilters";

export const metadata = { title: "Groceries" };

export default async function GroceriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
        { list: { groupId: groupId ?? NO_GROUP } },
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
  const purchasedCount = groceryItems.filter(i => i.status === "PURCHASED").length;

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Groceries</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              Shopping Workspace
            </span>
          </div>
          <p>
            {pendingCount === 0
              ? "All lists are clear. Nothing pending to purchase."
              : `${pendingCount} item${pendingCount > 1 ? "s" : ""} pending across your household lists.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/groceries/shopping" className="btn-galley-secondary">
            <ShoppingCart className="size-4 text-primary" />
            <span>Shopping Mode</span>
          </Link>
          <CategoryManager initialCategories={categories} />
          <AddGroceryItemModal lists={lists} categories={categories} />
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">TO BUY</span>
          <b className="stat-val">{pendingCount}</b>
          <small className="stat-sub">Pending items</small>
        </div>

        <div>
          <span className="stat-label">PURCHASED</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400">{purchasedCount}</b>
          <small className="stat-sub">Completed recently</small>
        </div>

        <div>
          <span className="stat-label">TOTAL ITEMS</span>
          <b className="stat-val">{groceryItems.length}</b>
          <small className="stat-sub">In current registry</small>
        </div>

        <div>
          <span className="stat-label">ACTIVE LISTS</span>
          <b className="stat-val">{lists.length}</b>
          <small className="stat-sub">Stores & categories</small>
        </div>
      </div>

      {/* Quick Add Bar for Multiple Items */}
      <QuickAddGroceryBar listId={lists[0]?.id} listName={lists[0]?.name} />

      {/* Grocery Items List in Galley Card */}
      <section className="galley-card">
        <GroceryListWithFilters initialItems={groceryItems} />
      </section>
    </div>
  );
}
