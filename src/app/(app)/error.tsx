"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 md:p-10 max-w-md mx-auto text-center space-y-4 pt-24">
      <h1 className="text-xl font-semibold tracking-tight">That did not work</h1>
      <p className="text-sm text-muted-foreground">
        Something went wrong while loading this page. Your data is safe. Try again, and if it keeps happening, come back in a minute.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
