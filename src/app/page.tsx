"use client";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { motion } from "motion/react";
import { 
  CheckSquare, 
  ShoppingCart, 
  Wallet, 
  Zap, 
  Shield, 
  Users,
  ChevronRight,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Task Management",
    description: "Organize your daily chores, work projects, and personal goals with ease.",
    icon: CheckSquare,
    color: "bg-blue-500",
    id: "tasks"
  },
  {
    title: "Grocery Lists",
    description: "Smart shopping lists that sync across devices and track household needs.",
    icon: ShoppingCart,
    color: "bg-emerald-500",
    id: "grocery"
  },
  {
    title: "Finance Tracker",
    description: "Manage budgets, track expenses, and visualize your financial health.",
    icon: Wallet,
    color: "bg-amber-500",
    id: "finance"
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Navbar />
      
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow delay-700" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow delay-1000" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
              <Sparkles className="size-4" />
              <span>Version 1.0 is now live</span>
            </div>
            
            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight">
              Manage your <span className="text-gradient">Life</span> with <br />
              Total Control.
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              LifeHub is your unified command center for tasks, groceries, and finances. 
              Designed for households that value organization and clarity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-8 text-lg h-14 group">
                  Get Started Free
                  <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="rounded-full px-8 text-lg h-14">
                  Explore Features
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="size-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Joined by <span className="text-foreground font-bold">2,000+</span> users this month
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10 glass rounded-3xl overflow-hidden shadow-2xl border-gradient animate-float">
              <Image 
                src="/hero.png" 
                alt="LifeHub Dashboard" 
                width={800} 
                height={600} 
                className="w-full h-auto"
                priority
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 size-40 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 size-40 bg-primary/10 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Everything you need in one place</h2>
            <p className="text-lg text-muted-foreground">
              Stop juggling multiple apps. LifeHub brings your most important daily tools together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                id={feature.id}
                className="group p-8 rounded-3xl bg-background border hover:shadow-xl hover:border-primary/20 transition-all cursor-default"
              >
                <div className={cn("size-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform", feature.color)}>
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Prop */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <h2 className="text-4xl font-bold tracking-tight leading-snug">
                Built for the modern household <br />
                <span className="text-primary">Collaborative by design.</span>
              </h2>
              
              <div className="space-y-8">
                {[
                  { icon: Zap, title: "Lightning Fast", desc: "No loading screens. Just smooth, instant transitions." },
                  { icon: Users, title: "Shared Access", desc: "Invite family members to share lists and track budgets." },
                  { icon: Shield, title: "Privacy First", desc: "Your data is encrypted and secure. Always." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <item.icon className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{item.title}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:h-[500px] flex items-center justify-center">
              <div className="relative z-10 p-8 glass rounded-3xl border shadow-2xl space-y-6 w-full max-w-md">
                <div className="flex items-center gap-3">
                  <div className="size-3 rounded-full bg-red-400" />
                  <div className="size-3 rounded-full bg-amber-400" />
                  <div className="size-3 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-4">
                  <div className="h-4 w-3/4 bg-muted rounded-full animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded-full animate-pulse delay-75" />
                  <div className="h-20 w-full bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-center">
                    <Zap className="size-8 text-primary animate-bounce" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-muted rounded-xl animate-pulse" />
                    <div className="h-12 bg-muted rounded-xl animate-pulse delay-150" />
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] bg-primary/10 rounded-full blur-3xl -z-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <LayoutDashboard className="size-5" />
            </div>
            <span className="text-xl font-bold">LifeHub</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 LifeHub Inc. All rights reserved. Built with elegance.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
