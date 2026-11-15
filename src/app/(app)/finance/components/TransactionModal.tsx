"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TransactionType, PaymentMethod } from "@prisma/client";
import { createTransaction } from "@/lib/actions/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.string().min(1, "Amount is required"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export function TransactionModal({ categories }: { categories: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: TransactionType.EXPENSE,
      paymentMethod: PaymentMethod.CASH,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      categoryId: "",
      description: "",
    },
  });

  const selectedType = form.watch("type");
  const filteredCategories = categories.filter((c) => c.type === selectedType);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await createTransaction({
        ...values,
        amount: parseFloat(values.amount),
        date: new Date(values.date),
        currency: "USD",
        isRecurring: false,
      });
      toast.success("Transaction recorded");
      setOpen(false);
      form.reset({
        type: TransactionType.EXPENSE,
        paymentMethod: PaymentMethod.CASH,
        date: new Date().toISOString().split("T")[0],
        amount: "",
        categoryId: "",
        description: "",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-8 sm:h-9 text-xs font-medium gap-1.5 shadow-2xs">
            <Plus className="size-3.5" />
            <span>Add Transaction</span>
          </Button>
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            New Transaction
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record an expense, income, or transfer in your ledger.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                      <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                      <SelectItem value={TransactionType.TRANSFER}>Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        className="h-9 font-mono"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(filteredCategories.length > 0 ? filteredCategories : categories).map(
                          (cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="truncate">{cat.name}</span>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                        <SelectItem value={PaymentMethod.CREDIT_CARD}>Credit Card</SelectItem>
                        <SelectItem value={PaymentMethod.DEBIT_CARD}>Debit Card</SelectItem>
                        <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                        <SelectItem value={PaymentMethod.DIGITAL_WALLET}>Digital Wallet</SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="What was this transaction for?" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
