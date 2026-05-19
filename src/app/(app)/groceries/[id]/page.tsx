import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { GroceryItemCard } from "@/components/groceries/grocery-item";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { ShareModal } from "@/components/ShareModal";
import { ShoppingBasket, Store, Package, CheckCircle2, Clock, AlertCircle, Menu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getActiveGroupId } from "@/lib/actions/user";
import { getGroceryLists } from "@/lib/actions/groceries";
import { GrocerySidebar } from "@/components/groceries/grocery-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EditGroceryListModal } from "@/components/groceries/EditGroceryListModal";

export default async function GroceryListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const list = await prisma.groceryList.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { groupId: groupId || undefined },
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
  const unavailableItems = items.filter(i => i.status === "UNAVAILABLE");

  const categoryGroups = pendingItems.reduce((acc: Record<string, typeof pendingItems>, item) => {
    const cat = item.category || "Uncategorized";
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
    <div className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] bg-emerald-400/5 blur-[120px] rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl shadow-inner border border-emerald-50 dark:border-emerald-800">
              <Store className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">{list.name}</h1>
              {list.description && (
                <p className="text-slate-400 font-medium mt-1">{list.description}</p>
              )}
            </div>
          </div>
          {list.defaultStore && (
            <p className="text-sm text-slate-400 font-bold ml-16">
              🏪 {list.defaultStore}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
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

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-5 text-center">
                <Package className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                <div className="text-3xl font-black">{pendingItems.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">To Buy</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-5 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                <div className="text-3xl font-black text-emerald-600">{purchasedItems.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bought</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-5 text-center">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <div className="text-3xl font-black">${totalEstimated.toFixed(0)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white dark:bg-slate-900">
              <CardContent className="p-5 text-center">
                <AlertCircle className="h-5 w-5 text-rose-500 mx-auto mb-2" />
                <div className="text-3xl font-black text-rose-600">${totalActual.toFixed(0)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Spent</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Items by Category */}
          {Object.keys(categoryGroups).length > 0 && (
            <div className="space-y-8">
              {Object.entries(categoryGroups).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {category}
                    <span className="text-xs text-slate-300 font-bold">({items.length})</span>
                  </h3>
                  <div className="grid gap-3">
                    {items.map((item) => (
                      <GroceryItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingItems.length === 0 && purchasedItems.length === 0 && (
            <div className="text-center py-24 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <ShoppingBasket className="h-10 w-10 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-900 dark:text-slate-100 text-xl font-black">This list is empty</p>
                <p className="text-sm text-slate-400 font-bold">Add items to start your shopping trip.</p>
              </div>
            </div>
          )}

          {/* Purchased Items */}
          {purchasedItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 px-1">
                <CheckCircle2 className="h-4 w-4" />
                Purchased ({purchasedItems.length})
              </h2>
              <div className="grid gap-2 opacity-60">
                {purchasedItems.map((item) => (
                  <GroceryItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
    </div>
  );
}
