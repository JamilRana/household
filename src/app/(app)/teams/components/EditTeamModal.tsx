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
import { Settings2, Loader2, Smile } from "lucide-react";
import { updateGroupDetails } from "@/lib/actions/groups";

export function EditTeamModal({ team }: { team: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [icon, setIcon] = useState(team.icon || "👥");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateGroupDetails(team.id, {
        name: name.trim(),
        description: description.trim(),
        icon: icon.trim()
      });
      setOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-2xl h-11 w-11 bg-white/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-950 shadow-sm border border-slate-100 dark:border-slate-800">
          <Settings2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tight text-white">Edit Team</DialogTitle>
              <DialogDescription className="text-slate-300 font-bold">
                Update your team's profile and settings.
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
                  <div className="absolute -bottom-2 -right-2 bg-white text-slate-900 p-1.5 rounded-xl shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Smile className="h-4 w-4" />
                  </div>
               </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Team Name</label>
              <Input 
                placeholder="Team Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 font-bold rounded-xl border-slate-200 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Description</label>
              <Textarea 
                placeholder="Team Description" 
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
                className="flex-1 h-12 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-xl hover:bg-slate-800"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
