"use client";

import { useState } from "react";
import { 
  renameGroup, 
  leaveGroup, 
  updateMemberRole, 
  transferOwnership, 
  deleteGroup,
  removeMember
} from "@/lib/actions/groups";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Crown, 
  Loader2, 
  MoreVertical,
  Shield,
  ShieldCheck,
  Trash2,
  ArrowRightLeft,
  Settings2,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AddMemberModal } from "./AddMemberModal";
import { EditTeamModal } from "./EditTeamModal";

export function TeamCard({ team, allUsers }: { team: any; allUsers: any[] }) {
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isOwner = team.role === "OWNER";
  const isAdmin = team.role === "ADMIN" || isOwner;

  const handleUpdateRole = async (memberId: string, role: "ADMIN" | "MEMBER" | "GUEST") => {
    setIsUpdatingRole(memberId);
    try {
      await updateMemberRole(team.id, memberId, role);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (!confirm("Are you sure you want to transfer ownership? You will be demoted to ADMIN.")) return;
    try {
      await transferOwnership(team.id, memberId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to transfer");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(team.id, memberId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  const handleDelete = async () => {
    if (!confirm("CRITICAL: Delete this team and all associated data?")) return;
    setDeleting(true);
    try {
      await deleteGroup(team.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this team?")) return;
    setLeaving(true);
    try {
      await leaveGroup(team.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden group">
      <CardContent className="p-0">
        {/* Team Header */}
        <div className="p-8 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="bg-white dark:bg-slate-950 w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform duration-500">
                {team.icon || "👥"}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight">{team.name}</h3>
                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg border-none shadow-sm",
                    isOwner ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                  )}>
                    {team.role}
                  </Badge>
                  <span className="text-sm text-slate-400 font-bold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {team.memberCount} Members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && <EditTeamModal team={team} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl h-11 w-11 bg-white/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-950 shadow-sm border border-slate-100 dark:border-slate-800">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-[1.5rem] shadow-2xl border-slate-100 dark:border-slate-800">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Team Actions</DropdownMenuLabel>
                    {isOwner ? (
                      <DropdownMenuItem 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-xl px-4 py-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        <span className="font-bold">Delete Team</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={handleLeave}
                        disabled={leaving}
                        className="rounded-xl px-4 py-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        <span className="font-bold">Leave Team</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {team.description && (
            <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium leading-relaxed bg-white/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-white/50 dark:border-slate-800/50">
              {team.description}
            </p>
          )}
        </div>

        {/* Members Section */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Members
            </h4>
            {isAdmin && <AddMemberModal teamId={team.id} allUsers={allUsers} existingMembers={team.members} />}
          </div>

          <div className="grid gap-3">
            {team.members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group/member">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-md">
                      <AvatarImage src={member.image || ""} />
                      <AvatarFallback className="bg-indigo-600 text-white font-black">
                        {member.name?.[0] || member.email?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {member.role === "OWNER" && (
                      <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                        <Crown className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white leading-tight">{member.name || "Anonymous User"}</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={cn(
                    "border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full",
                    member.role === "OWNER" ? "bg-amber-100 text-amber-700" :
                    member.role === "ADMIN" ? "bg-violet-100 text-violet-700" :
                    "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  )}>
                    {member.role}
                  </Badge>

                  {isAdmin && member.role !== "OWNER" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover/member:opacity-100 transition-opacity" disabled={isUpdatingRole === member.id}>
                          {isUpdatingRole === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-slate-100 dark:border-slate-800">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2">Manage Member</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "ADMIN")} className="rounded-xl px-4 py-2.5 cursor-pointer">
                            <ShieldCheck className="h-4 w-4 mr-3 text-indigo-600" />
                            <span className="font-bold">Make Admin</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "MEMBER")} className="rounded-xl px-4 py-2.5 cursor-pointer">
                            <Users className="h-4 w-4 mr-3 text-slate-600" />
                            <span className="font-bold">Make Member</span>
                          </DropdownMenuItem>
                          {isOwner && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleTransferOwnership(member.id)} className="rounded-xl px-4 py-2.5 cursor-pointer text-amber-600">
                                <ArrowRightLeft className="h-4 w-4 mr-3" />
                                <span className="font-bold">Transfer Ownership</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRemoveMember(member.id)}
                            className="rounded-xl px-4 py-2.5 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            <span className="font-bold">Remove Member</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Created {format(new Date(team.createdAt), "MMM d, yyyy")}
          </div>
          <div className="flex -space-x-3 overflow-hidden">
            {team.members.slice(0, 5).map((m: any) => (
              <Avatar key={m.id} className="h-8 w-8 border-2 border-white dark:border-slate-900">
                <AvatarImage src={m.image || ""} />
                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px] font-black">
                  {m.name?.[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {team.memberCount > 5 && (
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
                +{team.memberCount - 5}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LogOut(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}
