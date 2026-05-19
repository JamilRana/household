"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [currentName, setCurrentName] = useState(name);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!currentName.trim() || currentName === name) return;
    setLoading(true);
    try {
      await updateProfile({ name: currentName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400">Display Name</Label>
          <Input
            id="name"
            value={currentName}
            onChange={(e) => setCurrentName(e.target.value)}
            className="text-lg font-bold"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
          <Input
            value={email}
            disabled
            className="text-lg font-medium text-slate-400 bg-slate-50 dark:bg-slate-800"
          />
          <p className="text-[10px] text-slate-400 font-bold">Email cannot be changed.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || currentName === name || !currentName.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700 font-bold py-5"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="mr-2 h-4 w-4" /> Saved!</>
          ) : (
            "Update Profile"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
