"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateGroceryList, deleteGroceryList } from "@/lib/actions/groceries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Settings, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
        setOpen(false);
      } catch (error) {
        console.error(error);
      }
    });
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGroceryList(list.id);
      setOpen(false);
      router.push("/groceries");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl border border-slate-200 dark:border-slate-800">
          <Settings className="h-4 w-4 text-slate-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Shopping List</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultStore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Store (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Walmart, Whole Foods..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-3 pt-2">
              {showConfirm ? (
                <div className="flex flex-col gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl w-full">
                  <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                    Are you absolutely sure you want to delete this list?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="flex-1 py-4 text-xs font-bold rounded-xl"
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Delete"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isDeleting}
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-4 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 w-full">
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={isPending || isDeleting}
                    onClick={() => setShowConfirm(true)}
                    className="w-12 h-11 shrink-0 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending || isDeleting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-6 text-base font-bold rounded-xl"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
