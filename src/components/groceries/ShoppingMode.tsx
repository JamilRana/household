"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
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

  // One tap puts it in the cart. No pop-ups: the price defaults to the estimate and the
  // receipt total entered at the end is what really counts.
  const handleToggle = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const price = item.estimatedPrice ? Number(item.estimatedPrice) * Number(item.quantity || 1) : 0;
    setPurchasedPrices((prev) => ({ ...prev, [itemId]: price }));
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    toast(`In the cart: ${item.name}`, {
      action: {
        label: "Undo",
        onClick: () => {
          setPurchasedPrices((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          setItems((prev) => (prev.some((i) => i.id === itemId) ? prev : [...prev, item]));
        },
      },
    });
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await finalizeShoppingSession(purchasedPrices, parseFloat(manualTotal) || undefined);
      router.push("/groceries");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the trip. Nothing was lost, try again.");
    } finally {
      setIsFinishing(false);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category || "Uncategorized"))).sort();
  const estimatedTotal = items.reduce((sum, item) => sum + Number(item.estimatedPrice || 0) * Number(item.quantity || 1), 0);
  const actualRunningTotal = Object.values(purchasedPrices).reduce((sum, p) => sum + p, 0);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-y-auto">
      <header className="p-6 border-b flex items-center justify-between bg-background/80 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/groceries">
            <Button variant="ghost" size="icon" className="rounded-2xl" aria-label="Back">
              <ArrowLeft className="size-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Shopping</h1>
            <p className="text-sm font-medium text-muted-foreground">{items.length} items remaining</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
            <span>Est: {formatMoney(estimatedTotal)}</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-semibold text-lg">
            <CircleDollarSign className="size-5" />
            <span>{formatMoney(actualRunningTotal)}</span>
          </div>
          {items.length === 0 && (
             <Button 
                onClick={() => setShowFinishPrompt(true)}
                className="mt-1 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs px-4"
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
              <h2 className="text-3xl font-semibold">Everything is in the cart</h2>
              <p className="text-muted-foreground font-medium max-w-xs">That is the whole list. Add the receipt total and you are done.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                onClick={() => setShowFinishPrompt(true)}
                className="rounded-2xl h-16 font-semibold text-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
                  <h3 className="font-semibold text-xs text-muted-foreground">{category}</h3>
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
                        className="p-6 bg-card border-2 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-primary transition-all shadow-sm select-none"
                      >
                        <div className="flex items-center gap-5">
                          <div className="size-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Tag className="size-6 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-xl leading-tight">{item.name}</p>
                            <p className="text-xs font-semibold text-muted-foreground mt-1 opacity-60">
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
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setShowFinishPrompt(false)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[3rem] p-8 z-[70] shadow-md border-t"
            >
              <div className="max-w-md mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-semibold">Shopping Summary</h3>
                  <button onClick={() => setShowFinishPrompt(false)} className="size-10 rounded-full bg-muted flex items-center justify-center">
                    <X className="size-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-6 bg-primary/5 rounded-2xl space-y-1">
                    <p className="text-xs font-semibold text-primary">Calculated Total</p>
                    <p className="text-4xl font-semibold tracking-tight">{formatMoney(actualRunningTotal)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Manual Override (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">$</span>
                      <Input 
                        type="number"
                        placeholder={actualRunningTotal.toFixed(2)}
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        className="h-20 pl-12 text-3xl font-semibold rounded-2xl bg-muted/50 border-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="w-full h-16 rounded-2xl font-semibold text-xl bg-primary hover:bg-primary/90 shadow-sm"
                >
                  {isFinishing ? <Loader2 className="size-6 animate-spin" /> : "Complete Trip"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <footer className="p-6 bg-background/80 border-t fixed bottom-0 left-0 right-0 z-10 flex justify-center">
           <div className="max-w-2xl w-full flex items-center justify-between gap-6">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(initialItems.length - items.length) / initialItems.length * 100}%` }}
                />
              </div>
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-lg font-semibold tracking-tight leading-none">
                  {Math.round((initialItems.length - items.length) / initialItems.length * 100)}%
                </span>
                <span className="text-xs font-semibold text-muted-foreground">Complete</span>
              </div>
           </div>
        </footer>
      )}
    </div>
  );
}
