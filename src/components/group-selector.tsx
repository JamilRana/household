"use client";

import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  Users, 
  Plus, 
  Check, 
  User,
  MoreVertical,
  Settings
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUserGroups, setActiveGroup, getActiveGroupId } from "@/lib/actions/user";

export function GroupSelector({ className }: { className?: string }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [userGroups, currentId] = await Promise.all([
        getUserGroups(),
        getActiveGroupId()
      ]);
      setGroups(userGroups);
      setActiveGroupId(currentId);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleSelectGroup = async (id: string | null) => {
    setActiveGroupId(id);
    await setActiveGroup(id);
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  if (isLoading) {
    return (
      <div className={cn("h-11 w-full bg-muted animate-pulse rounded-2xl", className)} />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "w-full h-14 justify-between px-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-muted/50 transition-all group",
            className
          )}
        >
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {activeGroup ? (
                <span className="text-sm font-black">{activeGroup.name[0].toUpperCase()}</span>
              ) : (
                <User className="size-4" />
              )}
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Active Workspace</span>
              <span className="text-sm font-bold truncate max-w-[120px]">
                {activeGroup ? activeGroup.name : "Personal Space"}
              </span>
            </div>
          </div>
          <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-2 rounded-3xl shadow-2xl border-muted/50" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            My Workspaces
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            className={cn(
              "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all",
              !activeGroupId ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            )}
            onClick={() => handleSelectGroup(null)}
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                <User className="size-4" />
              </div>
              <span className="font-bold text-sm">Personal Space</span>
            </div>
            {!activeGroupId && <Check className="size-4" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2 bg-muted/50" />

        <DropdownMenuGroup>
          {groups.map((group) => (
            <DropdownMenuItem 
              key={group.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all mb-1",
                activeGroupId === group.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              onClick={() => handleSelectGroup(group.id)}
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-black">{group.name[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{group.name}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{group.memberCount} members</span>
                </div>
              </div>
              {activeGroupId === group.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2 bg-muted/50" />
        
        <DropdownMenuItem className="p-3 rounded-2xl cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all group">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary-foreground/20">
              <Plus className="size-4" />
            </div>
            <span className="font-bold text-sm">Create New Group</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
