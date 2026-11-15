import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12">
      {/* Galley brushed steel scene with warm heat-lamp glow */}
      <div className="scene" aria-hidden="true">
        <i className="scene-sheen" />
      </div>

      <div className="w-full max-w-[420px] space-y-8 z-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/login" className="flex items-center gap-3 group">
            <div className="size-11 rounded-[14px] bg-gradient-to-br from-[#ffc061] via-[#ff7a2f] to-[#e2441b] p-2.5 shadow-[inset_0_1px_rgba(255,255,255,0.65),0_8px_20px_-6px_rgba(239,90,28,0.8)] flex items-center justify-center text-[#2a1205] transition-transform group-hover:scale-105">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 6.5V5M8.5 19h7" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">LifeHub</span>
          </Link>
          <p className="text-sm text-muted-foreground">Your household, in one place</p>
        </div>

        <div className="galley-card p-6 sm:p-8 shadow-2xl">
          {children}
        </div>

        <footer className="text-center text-xs text-muted-foreground">
          Private to your household
        </footer>
      </div>
    </div>
  );
}
