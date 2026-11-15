"use client";

import { useState } from "react";
import { Plus, Smile, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGroup } from "@/lib/actions/groups";
import { toast } from "sonner";

export function CreateTeamModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createGroup(
        name.trim(),
        description.trim() || undefined
      );
      toast.success("Team created");
      setOpen(false);
      setName("");
      setDescription("");
      setIcon("🚀");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-8 sm:h-9 text-xs font-medium gap-1.5 shadow-2xs">
            <Plus className="size-3.5" />
            <span>Create Team</span>
          </Button>
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Create New Team
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Set up a collaborative workspace for tasks and resources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="relative group shrink-0">
              <div className="size-12 rounded-lg border border-border bg-background flex items-center justify-center text-2xl cursor-pointer hover:border-primary/50 transition-colors">
                {icon}
              </div>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                maxLength={2}
                aria-label="Team emoji icon"
              />
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity">
                <Smile className="size-3" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Team Icon</p>
              <p className="text-[11px] text-muted-foreground">Click icon to change emoji avatar</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Team Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Household, Operations, Design"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="What is this team responsible for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs min-h-[70px] resize-none"
            />
          </div>

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
            <Button type="submit" size="sm" disabled={loading || !name.trim()}>
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating...</span>
                </span>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
