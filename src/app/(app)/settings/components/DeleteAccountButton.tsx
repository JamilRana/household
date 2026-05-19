"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/actions/user";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("CRITICAL: Are you sure you want to delete your account? This will permanently erase all your tasks, finances, and household data. THIS ACTION CANNOT BE UNDONE.")) {
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/register" });
    } catch (error) {
      alert("Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Delete Account
    </button>
  );
}
