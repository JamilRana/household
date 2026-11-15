import { GalleyTopbar } from "@/components/galley-topbar";
import { GalleyBottombar } from "@/components/galley-bottombar";
import { QuickAdd } from "@/components/quick-add";
import { isAdminRole } from "@/components/nav-items";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);

  return (
    <div className="relative min-h-screen text-foreground font-sans">
      {/* Galley brushed steel scene with warm overhead heat-lamp glow */}
      <div className="scene" aria-hidden="true">
        <i className="scene-sheen" />
      </div>

      {/* Floating glass pill top navigation bar */}
      <GalleyTopbar isAdmin={isAdmin} user={session?.user} />

      {/* Main Content Arena */}
      <main className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 pb-28 md:pb-12 min-h-[calc(100vh-80px)]">
        {children}
      </main>

      {/* Mobile Floating Bottom Bar */}
      <GalleyBottombar isAdmin={isAdmin} />

      {/* Quick Add modal dialog (triggered via '+ New' or 'c') */}
      <QuickAdd />
    </div>
  );
}
