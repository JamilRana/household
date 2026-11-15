"use client";

import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { useState } from "react";
import { deleteAccount } from "@/lib/actions/user";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!(await confirm({ title: "Close your account?", description: "You will be signed out on every device. This cannot be undone from the app.", confirmLabel: "Close account", destructive: true }))) {
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/register" });
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg flex items-center gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Delete Account
    </button>
  );
}
