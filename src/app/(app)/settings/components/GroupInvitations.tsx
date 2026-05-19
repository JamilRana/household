"use client";

import { useState } from "react";
import { acceptInvitation } from "@/lib/actions/groups";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Loader2, Check, X } from "lucide-react";

interface GroupInvitationsProps {
  invitations: any[];
}

export function GroupInvitations({ invitations: initialInvitations }: GroupInvitationsProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (token: string, id: string) => {
    setProcessing(id);
    try {
      await acceptInvitation(token);
      setInvitations(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to accept");
    } finally {
      setProcessing(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-amber-600 flex items-center gap-2 px-1">
        <Mail className="h-4 w-4" /> Pending Invitations
      </h2>
      <div className="grid gap-4">
        {invitations.map((inv) => (
          <Card key={inv.id} className="border-none shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 font-black text-xl">
                  {inv.group.icon || inv.group.name[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100">{inv.group.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={inv.inviter.image || ""} />
                      <AvatarFallback className="text-[6px]">{inv.inviter.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Invited by <span className="text-amber-600">{inv.inviter.name}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAccept(inv.token, inv.id)}
                  disabled={processing === inv.id}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl h-10 px-4"
                >
                  {processing === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 w-10 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
