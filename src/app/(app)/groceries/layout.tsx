import { auth } from "@/lib/auth";
import { getActiveGroupId } from "@/lib/actions/user";
import { GrocerySidebar } from "@/components/groceries/grocery-sidebar";
import { getGroceryLists } from "@/lib/actions/groceries";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default async function GroceriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const groupId = await getActiveGroupId(session.user.id);
  const lists = await getGroceryLists(groupId);

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0">
        <GrocerySidebar lists={lists} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header with Sidebar Trigger */}
        <div className="lg:hidden px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-slate-950 shrink-0">
          <h2 className="font-black tracking-tighter text-xl">Groceries</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <GrocerySidebar lists={lists} isMobile />
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
