import { formatMoney } from "@/lib/format";
import { redirect, notFound } from "next/navigation";
import { NO_GROUP } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GroceryItemCard } from "@/components/groceries/grocery-item";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { QuickAddGroceryBar } from "@/components/groceries/QuickAddGroceryBar";
import { ShareModal } from "@/components/ShareModal";
import { 
  ShoppingBasket, 
  Store, 
  Package, 
  CheckCircle2, 
  Clock, 
  Banknote,
  Users,
  Lock,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/actions/user";
import { getGroceryLists } from "@/lib/actions/groceries";
import { EditGroceryListModal } from "@/components/groceries/EditGroceryListModal";

export default async function GroceryListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const list = await prisma.groceryList.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId ?? NO_GROUP },
        { shares: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      items: {
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
      },
      owner: { select: { name: true, image: true } },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!list) return notFound();

  // Convert Decimals to numbers for client components
  const items = list.items.map(item => ({
    ...item,
    quantity: Number(item.quantity),
    estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    actualPrice: item.actualPrice ? Number(item.actualPrice) : null,
  }));

  const pendingItems = items.filter(i => i.status === "PENDING");
  const purchasedItems = items.filter(i => i.status === "PURCHASED");

  const categoryGroups = pendingItems.reduce((acc: Record<string, typeof pendingItems>, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalEstimated = list.items
    .filter(i => i.status === "PENDING" && i.estimatedPrice)
    .reduce((sum, i) => sum + Number(i.estimatedPrice), 0);

  const totalActual = purchasedItems
    .filter(i => i.actualPrice)
    .reduce((sum, i) => sum + Number(i.actualPrice), 0);

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/groceries"
              className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mr-1"
            >
              <ArrowLeft className="size-3.5 mr-1" />
              All Lists
            </Link>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                list.groupId
                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                  : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
              )}
            >
              {list.groupId ? <Users className="size-3" /> : <Lock className="size-3" />}
              {list.groupId ? "Group List" : "Personal List"}
            </span>

            <h1>{list.name}</h1>
          </div>

          <p>
            {list.description || (list.defaultStore ? `Default store: ${list.defaultStore}` : "Organized shopping list")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ShareModal 
            resourceType="GROCERY_LIST" 
            resourceId={list.id} 
            resourceName={list.name} 
          />
          <EditGroceryListModal 
            list={{
              id: list.id,
              name: list.name,
              description: list.description,
              defaultStore: list.defaultStore,
            }} 
          />
          <AddGroceryItemModal lists={lists} defaultListId={list.id} categories={categories} />
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">TO BUY</span>
          <b className="stat-val">{pendingItems.length}</b>
          <small className="stat-sub">Pending items</small>
        </div>

        <div>
          <span className="stat-label">BOUGHT</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400">{purchasedItems.length}</b>
          <small className="stat-sub">Items picked up</small>
        </div>

        <div>
          <span className="stat-label">EST. TOTAL</span>
          <b className="stat-val tabular-nums">{formatMoney(totalEstimated, undefined, { cents: false })}</b>
          <small className="stat-sub">Planned expenditure</small>
        </div>

        <div>
          <span className="stat-label">SPENT</span>
          <b className="stat-val tabular-nums">{formatMoney(totalActual, undefined, { cents: false })}</b>
          <small className="stat-sub">Receipt total</small>
        </div>
      </div>

      {/* Quick Add Bar for Multiple Items */}
      <QuickAddGroceryBar listId={list.id} listName={list.name} />

      {/* Pending Items by Category */}
      {Object.keys(categoryGroups).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(categoryGroups).map(([category, groupItems]) => (
            <div key={category} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {category} ({groupItems.length})
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {groupItems.map((item) => (
                  <GroceryItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-border/80 bg-card/60 rounded-xl max-w-md mx-auto my-6">
          <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
            <ShoppingBasket className="size-5" />
          </div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">This list is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs leading-normal">
            Add items to this list to start your shopping.
          </p>
          <div className="mt-4">
            <AddGroceryItemModal lists={lists} defaultListId={list.id} categories={categories} />
          </div>
        </div>
      )}

      {/* Purchased Items Section */}
      {purchasedItems.length > 0 && (
        <div className="space-y-2.5 pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Purchased ({purchasedItems.length})
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 opacity-75">
            {purchasedItems.map((item) => (
              <GroceryItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
