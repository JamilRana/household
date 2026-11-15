"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addPantryItem } from "@/lib/actions/groceries";
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
  name: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  location: z.string().min(1, "Location is required"),
  expiryDate: z.string().optional(),
  categoryId: z.string().optional(),
});

interface AddPantryItemModalProps {
  locations?: string[];
  categories?: {
    id: string;
    name: string;
    color: string;
    isSystem: boolean;
  }[];
}

export function AddPantryItemModal({
  locations = ["Pantry", "Fridge", "Freezer"],
  categories = [],
}: AddPantryItemModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: "1",
      unit: "pcs",
      location: locations[0] || "Pantry",
      expiryDate: "",
      categoryId: "none",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await addPantryItem({
        ...values,
        quantity: parseFloat(values.quantity),
        expiryDate: values.expiryDate ? new Date(values.expiryDate) : undefined,
        categoryId: values.categoryId === "none" || !values.categoryId ? null : values.categoryId,
      });
      toast.success("Item added to inventory");
      setOpen(false);
      form.reset({
        name: "",
        quantity: "1",
        unit: "pcs",
        location: locations[0] || "Pantry",
        expiryDate: "",
        categoryId: "none",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add pantry item");
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
            <span>Add Item</span>
          </Button>
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Add Pantry Item
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Track shelf life, stock quantity, and storage zones.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Olive Oil, Milk, Pasta..." {...field} className="h-9" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="h-9 font-mono" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs, kg, box..." {...field} className="h-9" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-foreground">
                      Category <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Expiry Date <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="h-9" />
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
                {loading ? "Adding..." : "Add to Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
