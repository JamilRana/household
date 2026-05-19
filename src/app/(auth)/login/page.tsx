"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, ChevronLeft } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginSchema } from "@/lib/validations/auth";
import { Separator } from "@/components/ui/separator";
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
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="space-y-2 text-center pb-8">
        <CardTitle className="text-3xl font-extrabold tracking-tight">Welcome Back</CardTitle>
        <CardDescription className="text-base">
          Sign in to your LifeHub account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: any }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="name@example.com" 
                      className="h-12 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all rounded-xl" 
                      {...field} 
                      disabled={isLoading} 
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
                  <div className="flex items-center justify-between ml-1">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                    <Link href="#" className="text-xs font-bold text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <FormControl>
                    <Input 
                      type="password" 
                      className="h-12 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all rounded-xl"
                      {...field} 
                      disabled={isLoading} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/25 group" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Login to Account
                  <ChevronLeft className="size-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>
        </Form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <Separator className="bg-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background/0 px-4 text-muted-foreground font-bold tracking-widest">
              Social Login
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <Button variant="outline" className="w-full h-12 bg-background/50 border-muted-foreground/20 rounded-xl hover:bg-background/80" disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Continue with Google
          </Button>
        </div>

        <div className="text-center text-sm pt-4">
          <span className="text-muted-foreground">New to LifeHub?</span>{" "}
          <Link href="/register" className="font-bold text-primary hover:underline underline-offset-4">
            Create an Account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
