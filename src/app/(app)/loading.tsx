export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border border-border divide-y divide-border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="size-6 rounded-full bg-muted animate-pulse" />
            <div className="h-4 flex-1 max-w-sm rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
