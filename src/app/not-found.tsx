import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">We could not find that page</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        It may have been moved or deleted, or you might not have access to it.
      </p>
      <Link href="/dashboard">
        <Button>Back to Today</Button>
      </Link>
    </div>
  );
}
