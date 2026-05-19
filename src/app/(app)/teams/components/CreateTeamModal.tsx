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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Smile } from "lucide-react";
import { createGroup } from "@/lib/actions/groups";

export function CreateTeamModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("👥");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createGroup(name.trim(), description.trim());
      setOpen(false);
      setName("");
      setDescription("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-indigo-200 dark:shadow-none text-lg">
          <Plus className="h-6 w-6 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tight text-white">New Team</DialogTitle>
              <DialogDescription className="text-indigo-100 font-bold">
                Create a new space for your team to collaborate.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-8 flex justify-center">
               <div className="relative group">
                  <div className="bg-white/10 w-24 h-24 rounded-3xl flex items-center justify-center text-5xl border-2 border-white/20 group-hover:bg-white/20 transition-all cursor-pointer">
                    {icon}
                  </div>
                  <Input 
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    maxLength={2}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-white text-indigo-600 p-1.5 rounded-xl shadow-lg border border-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Smile className="h-4 w-4" />
                  </div>
               </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Team Name</label>
              <Input 
                placeholder="e.g. Engineering Team" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 font-bold rounded-xl border-slate-200 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Description (Optional)</label>
              <Textarea 
                placeholder="What is this team about?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] font-bold rounded-xl border-slate-200 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)}
                className="flex-1 h-12 font-black rounded-xl text-slate-400"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !name.trim()}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Team"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
