"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPasswordWithToken } from "@/lib/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setIsLoading(true);
    try {
      const res = await resetPasswordWithToken({ token, password });
      if (res && "error" in res && res.error) setError(res.error);
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
            <p className="text-sm text-muted-foreground">You have been signed out everywhere. Sign in with your new password.</p>
          </div>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full h-10 font-medium">Go to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">At least 10 characters. A few random words work well.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" required disabled={isLoading}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-xs font-medium">Type it again</Label>
          <Input id="confirm" type="password" autoComplete="new-password" required disabled={isLoading}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
