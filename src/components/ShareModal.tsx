"use client";
import { useState, useEffect } from "react";
import { Share2, UserPlus, Users, Copy, Check, X, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSharedUsers, shareResourceByUser, shareResourceByGroup, removeShare, getAvailableUsersForShare, getGroupsForShare } from "@/lib/actions/sharing";

interface ShareModalProps {
  resourceType: "TASK_LIST" | "TASK" | "GROCERY_LIST";
  resourceId: string;
  resourceName: string;
  trigger?: React.ReactNode;
}

export function ShareModal({ resourceType, resourceId, resourceName, trigger }: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharingUser, setSharingUser] = useState(false);
  const [search, setSearch] = useState("");
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, available, groupsData] = await Promise.all([
        getSharedUsers(resourceType, resourceId),
        getAvailableUsersForShare(resourceId),
        getGroupsForShare()
      ]);
      setSharedUsers(users);
      setAvailableUsers(available);
      setGroups(groupsData);
    } catch (error) {
      console.error("Failed to load shared users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareUser = async (userId: string) => {
    setSharingUser(true);
    try {
      await shareResourceByUser({ resourceType, resourceId, userId, role: "VIEWER" });
      toast.success("User added successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to share");
    } finally {
      setSharingUser(false);
    }
  };

  const handleShareGroup = async (groupId: string) => {
    setSharingUser(true);
    try {
      await shareResourceByGroup({ resourceType, resourceId, groupId });
      toast.success("Shared with group successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to share with group");
    } finally {
      setSharingUser(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      await removeShare(resourceType, resourceId, userId);
      toast.success("Access removed");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove access");
    }
  };

  const copyShareLink = () => {
    const basePath = resourceType === "GROCERY_LIST" ? "groceries" : "tasks";
    const shareUrl = `${window.location.origin}/${basePath}/${resourceId}?shared=true`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredAvailableUsers = availableUsers.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <Share2 className="size-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="w-full sm:max-w-md p-5 sm:p-6 rounded-xl border border-border bg-card shadow-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="size-4 text-primary" />
            <span>Share &ldquo;{resourceName}&rdquo;</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite members or teams to collaborate on this {resourceType === "TASK_LIST" || resourceType === "GROCERY_LIST" ? "list" : "task"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="users" className="text-xs font-medium">Users</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs font-medium">Teams</TabsTrigger>
            <TabsTrigger value="shared" className="text-xs font-medium">Access ({sharedUsers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3 mt-3 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            
            {loading ? (
              <div className="text-center py-6">
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredAvailableUsers.length > 0 ? (
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {filteredAvailableUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {user.name?.[0] || user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{user.name || "Unnamed"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button 
                      size="icon-xs" 
                      onClick={() => handleShareUser(user.id)}
                      disabled={sharingUser}
                      className="size-7"
                    >
                      {sharingUser ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No users available to invite
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-3 mt-3 overflow-y-auto flex-1 min-h-0 pr-1">
            {loading ? (
              <div className="text-center py-6">
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 bg-primary/10 rounded-md flex items-center justify-center text-sm shrink-0">
                        {group.icon || "👥"}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{group.name}</p>
                    </div>
                    <Button 
                      size="icon-xs" 
                      onClick={() => handleShareGroup(group.id)}
                      disabled={sharingUser}
                      className="size-7"
                    >
                      {sharingUser ? <Loader2 className="size-3 animate-spin" /> : <Users className="size-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No groups available. Create a group first.
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared" className="space-y-3 mt-3 overflow-y-auto flex-1 min-h-0 pr-1">
            {sharedUsers.length > 0 ? (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {sharedUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {user.name?.[0] || user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{user.name || "Unnamed"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveShare(user.id)}
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Remove access"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                No one else has access yet
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-3 border-t border-border mt-3">
          <div className="p-2.5 bg-muted/30 rounded-lg space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Share Direct Link</p>
            <div className="flex gap-1.5">
              <Input
                readOnly
                value={origin ? `${origin}/${resourceType === "GROCERY_LIST" ? "groceries" : "tasks"}/${resourceId}` : ""}
                className="h-8 font-mono text-[11px] bg-background"
              />
              <Button 
                size="icon-xs" 
                variant="outline" 
                onClick={copyShareLink}
                className="size-8 shrink-0"
                aria-label="Copy link"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}