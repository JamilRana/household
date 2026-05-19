"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, Check, X } from "lucide-react";
import { addMemberByUserId } from "@/lib/actions/groups";
import { cn } from "@/lib/utils";

export function AddMemberModal({ 
  teamId, 
  allUsers, 
  existingMembers 
}: { 
  teamId: string; 
  allUsers: any[]; 
  existingMembers: any[] 
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const existingUserIds = existingMembers.map(m => m.id);
  
  const filteredUsers = allUsers.filter(user => 
    (user.name?.toLowerCase().includes(search.toLowerCase()) || 
     user.email.toLowerCase().includes(search.toLowerCase())) &&
    !existingUserIds.includes(user.id)
  );

  const handleAddMember = async (userId: string) => {
    setAddingId(userId);
    try {
      await addMemberByUserId(teamId, userId);
      // Success is handled by revalidation, but we can close or show feedback
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-9 px-4 shadow-lg shadow-indigo-200 dark:shadow-none">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight text-white">Add Member</DialogTitle>
            <DialogDescription className="text-indigo-100 font-bold">
              Select a user from the directory to add to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300" />
            <Input 
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-indigo-200 font-bold rounded-2xl focus:bg-white/20 transition-all"
            />
          </div>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-slate-200 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-bold">No users found matching your search.</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-slate-50 dark:border-slate-700 shadow-sm">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 font-black">
                        {user.name?.[0] || user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white leading-tight">{user.name || "Anonymous"}</p>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleAddMember(user.id)}
                    disabled={addingId === user.id}
                    className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white transition-all p-0"
                  >
                    {addingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} className="font-black text-slate-400 hover:text-slate-600 rounded-xl">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
