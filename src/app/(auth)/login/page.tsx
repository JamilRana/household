"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/lib/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>("");

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof LoginSchema>) {
    setIsLoading(true);
    setError("");

    try {
      const data = await loginUser(values);
      if (data?.error) {
        setError(data.error);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your household credentials to access your dashboard.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }: { field: any }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium text-foreground">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }: { field: any }) => (
              <FormItem className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-medium text-foreground">Password</FormLabel>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Sign in
                <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
        </form>
      </Form>

      <div className="pt-2 border-t border-border text-center text-xs text-muted-foreground">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
          Register member
        </Link>
      </div>
    </div>
  );
}
