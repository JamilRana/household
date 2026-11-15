"use client";

import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, Plus, Check } from "lucide-react";
import { addMemberByUserId } from "@/lib/actions/groups";

export function AddMemberModal({
  teamId,
  allUsers,
  existingMembers,
}: {
  teamId: string;
  allUsers: any[];
  existingMembers: any[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const existingUserIds = existingMembers.map((m) => m.id);

  const filteredUsers = allUsers.filter(
    (user) =>
      (user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())) &&
      !existingUserIds.includes(user.id)
  );

  const handleAddMember = async (userId: string) => {
    setAddingId(userId);
    try {
      await addMemberByUserId(teamId, userId);
      toast.success("Member added to team");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-8 sm:h-9 text-xs font-medium gap-1.5 shadow-2xs">
            <UserPlus className="size-3.5" />
            <span>Add Member</span>
          </Button>
        }
      />
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Add Team Member
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite registered users from directory into this team.
          </DialogDescription>
        </DialogHeader>

        <div className="relative pt-1 pb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search directory by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {search ? "No matching users found" : "All eligible users are already in this team"}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {user.name?.[0] || user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {user.name || "Anonymous"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  size="icon-xs"
                  onClick={() => handleAddMember(user.id)}
                  disabled={addingId === user.id}
                  className="size-7"
                >
                  {addingId === user.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
