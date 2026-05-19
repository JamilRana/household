import Link from "next/link";
import { ChevronLeft, LayoutDashboard } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] size-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl group-hover:scale-110 transition-transform">
              <LayoutDashboard className="size-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight">LifeHub</span>
          </Link>
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="size-4 mr-1" />
            Back to home
          </Link>
        </div>

        <div className="glass-dark p-1 rounded-[2.5rem]">
           {children}
        </div>
      </div>
    </div>
  );
}
