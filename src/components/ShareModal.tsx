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
      
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-6 border-none shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Share2 className="size-5" />
            Share "{resourceName}"
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Invite users or groups to collaborate on this {resourceType === "TASK_LIST" || resourceType === "GROCERY_LIST" ? "list" : "task"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <TabsTrigger value="users" className="rounded-lg font-bold text-xs">Users</TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg font-bold text-xs">Groups</TabsTrigger>
            <TabsTrigger value="shared" className="rounded-lg font-bold text-xs">Shared</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 rounded-xl"
              />
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : filteredAvailableUsers.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {filteredAvailableUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-600">
                          {user.name?.[0] || user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{user.name || "Unnamed"}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleShareUser(user.id)}
                      disabled={sharingUser}
                      className="rounded-full text-xs font-bold h-8"
                    >
                      {sharingUser ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No users available to share with
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-4 mt-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-lg">
                        {group.icon || "👥"}
                      </div>
                      <p className="text-sm font-bold">{group.name}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleShareGroup(group.id)}
                      disabled={sharingUser}
                      className="rounded-full text-xs font-bold h-8"
                    >
                      {sharingUser ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No groups available. Create a group first.
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared" className="space-y-4 mt-4 overflow-y-auto flex-1">
            {sharedUsers.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {sharedUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs font-bold bg-emerald-100 text-emerald-600">
                          {user.name?.[0] || user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{user.name || "Unnamed"}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(user.id)}
                      className="size-8 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No one else has access yet
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Share Link</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={origin ? `${origin}/${resourceType === "GROCERY_LIST" ? "groceries" : "tasks"}/${resourceId}` : ""}
                className="h-9 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={copyShareLink}
                className="shrink-0 rounded-lg"
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}