"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateGroceryList, deleteGroceryList } from "@/lib/actions/groceries";
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
import { Settings, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  defaultStore: z.string().optional(),
});

interface EditGroceryListModalProps {
  list: {
    id: string;
    name: string;
    description: string | null;
    defaultStore: string | null;
  };
}

export function EditGroceryListModal({ list }: EditGroceryListModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: list.name,
      description: list.description || "",
      defaultStore: list.defaultStore || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        await updateGroceryList({
          id: list.id,
          ...values,
        });
        toast.success("List settings saved");
        setOpen(false);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to update list");
      }
    });
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGroceryList(list.id);
      toast.success("Grocery list deleted");
      setOpen(false);
      router.push("/groceries");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete list");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-8 text-muted-foreground hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </Button>
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Edit Grocery List
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update list title, default store location, or remove list.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">List Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly Groceries" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultStore"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Default Store <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Walmart, Whole Foods..." {...field} className="h-9" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {showConfirm ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                <p className="text-xs font-medium text-destructive">
                  Are you sure you want to delete this list and all its items?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 text-xs"
                  >
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowConfirm(true)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete list"
                >
                  <Trash2 className="size-4" />
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
