"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, ArrowLeft, ShoppingBag, ShoppingCart, Tag, ChevronRight, X, CircleDollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateItemStatus, finalizeShoppingSession } from "@/lib/actions/groceries";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ShoppingModeProps {
  initialItems: any[];
}

export function ShoppingMode({ initialItems }: ShoppingModeProps) {
  const [items, setItems] = useState(initialItems);
  const [purchasedPrices, setPurchasedPrices] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [manualTotal, setManualTotal] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const router = useRouter();

  const handleToggle = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const priceStr = prompt(`Enter price for ${item.name}:`, item.estimatedPrice ? Number(item.estimatedPrice).toString() : "");
    const price = parseFloat(priceStr || "0");

    setPurchasedPrices(prev => ({ ...prev, [itemId]: price }));
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await finalizeShoppingSession(purchasedPrices, parseFloat(manualTotal) || undefined);
      router.push("/groceries");
    } catch (error) {
      console.error(error);
    } finally {
      setIsFinishing(false);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category || "Uncategorized"))).sort();
  const estimatedTotal = items.reduce((sum, item) => sum + Number(item.estimatedPrice || 0) * Number(item.quantity || 1), 0);
  const actualRunningTotal = Object.values(purchasedPrices).reduce((sum, p) => sum + p, 0);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-y-auto">
      <header className="p-6 border-b flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/groceries">
            <Button variant="ghost" size="icon" className="rounded-2xl">
              <ArrowLeft className="size-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Shopping Mode</h1>
            <p className="text-sm font-medium text-muted-foreground">{items.length} items remaining</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
            <span>Est: ${estimatedTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-black text-lg">
            <CircleDollarSign className="size-5" />
            <span>${actualRunningTotal.toFixed(2)}</span>
          </div>
          {items.length === 0 && (
             <Button 
                onClick={() => setShowFinishPrompt(true)}
                className="mt-1 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest px-4"
              >
                Finish Shopping
              </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 pb-32">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
            <div className="size-32 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
              <Check className="size-16" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black">List Complete!</h2>
              <p className="text-muted-foreground font-medium max-w-xs">You've grabbed everything on your list. Ready to checkout?</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                onClick={() => setShowFinishPrompt(true)}
                className="rounded-3xl h-16 font-black text-xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 dark:shadow-none"
              >
                Enter Total & Finish
              </Button>
              <Link href="/groceries" className="w-full">
                <Button variant="ghost" className="w-full rounded-2xl h-12 font-bold text-muted-foreground">Skip & Back</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10 max-w-2xl mx-auto">
            {categories.map(category => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="size-2 rounded-full bg-primary" />
                  <h3 className="font-black uppercase tracking-[0.2em] text-xs text-muted-foreground">{category}</h3>
                </div>
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {items.filter(i => (i.category || "Uncategorized") === category).map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        onClick={() => handleToggle(item.id)}
                        className="p-6 bg-card border-2 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-primary transition-all shadow-sm active:scale-95 select-none"
                      >
                        <div className="flex items-center gap-5">
                          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Tag className="size-6 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div>
                            <p className="font-black text-xl leading-tight">{item.name}</p>
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mt-1 opacity-60">
                              {item.quantity} {item.unit} • {item.list?.name}
                            </p>
                          </div>
                        </div>
                        <div className="size-10 rounded-full border-4 border-muted flex items-center justify-center group-hover:border-primary transition-colors">
                          <div className="size-5 rounded-full bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showFinishPrompt && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setShowFinishPrompt(false)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[3rem] p-8 z-[70] shadow-2xl border-t"
            >
              <div className="max-w-md mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black">Shopping Summary</h3>
                  <button onClick={() => setShowFinishPrompt(false)} className="size-10 rounded-full bg-muted flex items-center justify-center">
                    <X className="size-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-6 bg-primary/5 rounded-3xl space-y-1">
                    <p className="text-xs font-black text-primary uppercase tracking-widest">Calculated Total</p>
                    <p className="text-4xl font-black tracking-tight">${actualRunningTotal.toFixed(2)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Manual Override (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        placeholder={actualRunningTotal.toFixed(2)}
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        className="h-20 pl-12 text-3xl font-black rounded-[2rem] bg-muted/50 border-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="w-full h-16 rounded-3xl font-black text-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25"
                >
                  {isFinishing ? <Loader2 className="size-6 animate-spin" /> : "Complete Trip"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <footer className="p-6 bg-background/80 backdrop-blur-md border-t fixed bottom-0 left-0 right-0 z-10 flex justify-center">
           <div className="max-w-2xl w-full flex items-center justify-between gap-6">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(initialItems.length - items.length) / initialItems.length * 100}%` }}
                />
              </div>
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-lg font-black tracking-tighter leading-none">
                  {Math.round((initialItems.length - items.length) / initialItems.length * 100)}%
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Complete</span>
              </div>
           </div>
        </footer>
      )}
    </div>
  );
}
