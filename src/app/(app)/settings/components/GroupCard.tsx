"use client";

import { useState } from "react";
import { 
  createGroup, 
  generateInvitation, 
  renameGroup, 
  leaveGroup, 
  updateMemberRole, 
  transferOwnership, 
  deleteGroup,
  updateGroupDetails,
  removeMember
} from "@/lib/actions/groups";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Users, 
  UserPlus, 
  Mail, 
  Crown, 
  Loader2, 
  MoreVertical,
  Shield,
  ShieldCheck,
  Trash2,
  ArrowRightLeft,
  Settings2,
  Smile,
  User
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

export function GroupCard({ group }: { group: any }) {
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(group?.name || "");
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      await createGroup(groupName.trim());
      setGroupName("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !group) return;
    setInviteLoading(true);
    try {
      await generateInvitation(group.id, inviteEmail.trim());
      setInviteEmail("");
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === group?.name) {
      setEditingName(false);
      return;
    }
    setRenaming(true);
    try {
      await renameGroup(group.id, newName.trim());
      setEditingName(false);
    } catch (error) {
      console.error(error);
    } finally {
      setRenaming(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setLeaving(true);
    try {
      await leaveGroup(group.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave");
    } finally {
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("CRITICAL: This will permanently delete the group and all its data. Are you absolutely sure?")) return;
    setDeleting(true);
    try {
      await deleteGroup(group.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: "ADMIN" | "MEMBER" | "GUEST") => {
    setIsUpdatingRole(memberId);
    try {
      await updateMemberRole(group.id, memberId, role);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (!confirm("Are you sure you want to transfer ownership? You will be demoted to ADMIN.")) return;
    try {
      await transferOwnership(group.id, memberId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to transfer");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the group?")) return;
    try {
      await removeMember(group.id, memberId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  if (!group) {
    return (
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="bg-violet-100 dark:bg-violet-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Home className="h-10 w-10 text-violet-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black">Create a Group</h3>
            <p className="text-slate-400 font-medium">Collaborate on tasks, groceries, and finances with your team or family.</p>
          </div>
          <div className="flex gap-3 max-w-sm mx-auto">
            <Input
              placeholder="e.g., Office Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="font-bold h-11 rounded-xl"
            />
            <Button
              onClick={handleCreate}
              disabled={loading || !groupName.trim()}
              className="bg-violet-600 hover:bg-violet-700 font-black h-11 px-6 shrink-0 rounded-xl"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOwner = group.role === "OWNER";
  const isAdmin = group.role === "ADMIN" || isOwner;

  return (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
      <CardContent className="p-0">
        {/* Group Header */}
        <div className="p-6 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-violet-100 dark:border-violet-900/30">
          <div className="flex items-center gap-4">
            <div className="bg-violet-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200 dark:shadow-none relative group/icon">
              {group.icon ? <span className="text-2xl">{group.icon}</span> : <Users className="h-6 w-6" />}
              {isAdmin && (
                <button className="absolute -top-2 -right-2 size-6 bg-background border rounded-full flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity shadow-sm">
                  <Smile className="size-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-9 font-black bg-white dark:bg-slate-900 rounded-xl"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleRename} disabled={renaming} className="rounded-xl">
                    {renaming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} className="rounded-xl">Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black">{group.name}</h3>
                  {isAdmin && (
                    <button onClick={() => setEditingName(true)} className="text-[10px] font-black text-violet-600/60 hover:text-violet-600 uppercase tracking-widest">Edit</button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 bg-background/50">
                  {group.role}
                </Badge>
                <span className="text-sm text-violet-600/60 font-bold">• {group.memberCount} members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="p-6 space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Members
          </h4>
          <div className="space-y-3">
            {group.members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={member.user?.image || ""} />
                    <AvatarFallback className="bg-violet-100 text-violet-600 font-black text-xs">
                      {member.user?.name?.[0] || member.user?.email?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-black text-sm">{member.user?.name || "User"}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{member.user?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    "border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5",
                    member.role === "OWNER"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : member.role === "ADMIN"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  )}>
                    {member.role === "OWNER" && <Crown className="h-3 w-3 mr-1" />}
                    {member.role}
                  </Badge>

                  {isAdmin && member.role !== "OWNER" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 rounded-xl" disabled={isUpdatingRole === member.id}>
                          {isUpdatingRole === member.id ? <Loader2 className="size-3 animate-spin" /> : <MoreVertical className="size-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-xl border-muted/50">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5">Manage Member</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "ADMIN")} className="rounded-xl cursor-pointer">
                            <ShieldCheck className="size-4 mr-2" /> <span className="font-bold text-sm">Make Admin</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "MEMBER")} className="rounded-xl cursor-pointer">
                            <Users className="size-4 mr-2" /> <span className="font-bold text-sm">Make Member</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(member.id, "GUEST")} className="rounded-xl cursor-pointer">
                            <User className="size-4 mr-2" /> <span className="font-bold text-sm">Make Guest</span>
                          </DropdownMenuItem>
                          
                          {isOwner && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleTransferOwnership(member.userId)} className="rounded-xl cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                                <ArrowRightLeft className="size-4 mr-2" /> <span className="font-bold text-sm">Transfer Ownership</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRemoveMember(member.id)}
                            className="rounded-xl cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <Trash2 className="size-4 mr-2" /> <span className="font-bold text-sm">Remove from Group</span>
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

        {/* Invite */}
        {isAdmin && (
          <div className="p-6 pt-0 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" /> Invite New Member
            </h4>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="font-bold h-11 rounded-xl"
              />
              <Button
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="bg-violet-600 hover:bg-violet-700 font-black h-11 px-6 shrink-0 rounded-xl"
              >
                {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
              </Button>
            </div>
            {inviteSent && (
              <p className="text-emerald-600 text-xs font-black bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl flex items-center gap-2">
                <span className="size-5 rounded-full bg-emerald-100 flex items-center justify-center">✓</span>
                Invitation sent successfully!
              </p>
            )}

            {/* Pending Invitations */}
            {group.invitations?.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Requests</p>
                {group.invitations.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-amber-500" />
                      <span className="font-bold text-amber-900 dark:text-amber-200">{inv.email}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black bg-amber-100/50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-none px-2 uppercase tracking-widest">Awaiting</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Permissions / Preferences */}
        <div className="p-6 pt-0 space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5" /> Group Preferences
          </h4>
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="space-y-0.5">
              <p className="text-sm font-black">Share Finance Data</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Allow other members to see group expenses</p>
            </div>
            <div className="size-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 flex justify-between items-center">
          {isOwner ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="size-3.5 mr-2" />}
              Delete Group
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Leave Group
            </Button>
          )}
          
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
