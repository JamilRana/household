"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await requestPasswordReset({ email });
      if (res && "error" in res && res.error) setError(res.error);
      else setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, we have sent a link to
              reset the password. It works for one hour.
            </p>
          </div>
        </div>
        <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we will send you a link to choose a new one.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading || !email}>
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}
