"use client";

import { useConfirm } from "@/components/confirm-provider";
import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Shield,
  Calendar,
  ShoppingCart,
  Banknote,
  ListTodo,
  AlertTriangle,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  Key,
  X,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  getAllUsersAdmin,
  getUserStats,
  getUserGroupsAdmin,
  deactivateUser,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  resetUserPassword,
  getDeactivatedUsers,
} from "@/lib/actions/admin";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserStats {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  _count: {
    tasks: number;
    groceryItems: number;
    transactions: number;
    memberships: number;
  };
}

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [deactivatedUsers, setDeactivatedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [editUser, setEditUser] = useState({ name: "", email: "" });
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [data, deactivated] = await Promise.all([
        getAllUsersAdmin(),
        getDeactivatedUsers(),
      ]);
      setUsers(data as UserStats[]);
      setDeactivatedUsers(deactivated);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSelectUser = async (user: UserStats) => {
    setSelectedUser(user);
    try {
      const [stats, groups] = await Promise.all([
        getUserStats(user.id),
        getUserGroupsAdmin(user.id),
      ]);
      setUserStats(stats);
      setUserGroups(groups);
      setEditUser({ name: user.name || "", email: user.email });
    } catch {
      toast.error("Failed to load user details");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser(newUser);
      toast.success("User created successfully");
      setCreateOpen(false);
      setNewUser({ name: "", email: "", password: "" });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await updateUser({ userId: selectedUser.id, ...editUser });
      toast.success("User updated successfully");
      setEditOpen(false);
      loadUsers();
      setSelectedUser({ ...selectedUser, ...editUser });
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) return;
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      toast.success("Password reset successfully");
      setPasswordOpen(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (
      !(await confirm({
        title: "Deactivate this user?",
        description: "They will not be able to sign in until you reactivate them.",
        confirmLabel: "Deactivate",
        destructive: true,
      }))
    )
      return;
    try {
      await deactivateUser({ userId });
      toast.success("User deactivated successfully");
      loadUsers();
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate user");
    }
  };

  const handleDelete = async (userId: string) => {
    if (
      !(await confirm({
        title: "Delete this user permanently?",
        description:
          "Their account and all their personal data will be removed. This cannot be undone.",
        confirmLabel: "Delete permanently",
        destructive: true,
      }))
    )
      return;
    try {
      await deleteUser(userId);
      toast.success("User deleted permanently");
      loadUsers();
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await reactivateUser(userId);
      toast.success("User reactivated successfully");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate user");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="p-8 text-center rounded-xl border border-destructive/30 bg-destructive/5 space-y-2 max-w-md mx-auto">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <h2 className="text-base font-semibold text-destructive">Access Restricted</h2>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>User Directory</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-1 border border-primary/20">
              <Shield className="size-3" />
              Administration
            </span>
          </div>
          <p>
            Manage system accounts, user permissions, and directory credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button type="button" className="btn-heat">
                <Plus className="size-3.5 stroke-[2.5]" />
                <span>Add User</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-5 rounded-2xl border border-rule bg-card shadow-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-base font-bold">Create User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Full Name</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Password</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="h-8 text-xs"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creating}
                    className="h-8 text-xs"
                  >
                    {creating ? <Loader2 className="size-3.5 animate-spin" /> : "Create User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">TOTAL USERS</span>
          <b className="stat-val">{users.length}</b>
          <small className="stat-sub">Registered accounts</small>
        </div>

        <div>
          <span className="stat-label">TOTAL TASKS</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400">
            {users.reduce((a, u) => a + u._count.tasks, 0)}
          </b>
          <small className="stat-sub">Across directory</small>
        </div>

        <div>
          <span className="stat-label">MEMBERSHIPS</span>
          <b className="stat-val">
            {users.reduce((a, u) => a + u._count.memberships, 0)}
          </b>
          <small className="stat-sub">Household seats</small>
        </div>

        <div>
          <span className="stat-label">DEACTIVATED</span>
          <b className="stat-val text-rose-600 dark:text-rose-400">
            {deactivatedUsers.length}
          </b>
          <small className="stat-sub">Inactive accounts</small>
        </div>
      </div>

      {/* Deactivated Users Notice */}
      {deactivatedUsers.length > 0 && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium">
            <AlertTriangle className="size-4 shrink-0 text-rose-500" />
            <span>{deactivatedUsers.length} account(s) currently deactivated</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {deactivatedUsers.slice(0, 3).map((u) => (
              <Button
                key={u.id}
                variant="outline"
                size="sm"
                onClick={() => handleReactivate(u.id)}
                className="h-7 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                <RotateCcw className="size-3 mr-1" /> Reactivate {u.name || u.email}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: User List + Details Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* User List Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-md bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-12 text-xs text-muted-foreground animate-pulse">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground rounded-lg border border-border bg-card">
                No users match your search.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors cursor-pointer select-none",
                    selectedUser?.id === user.id
                      ? "border-primary/60 bg-accent/40 shadow-2xs"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <Avatar className="size-9 border border-border shrink-0">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {user.name?.[0] || user.email[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {user.name || "Unnamed User"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <ListTodo className="size-3" />
                      {user._count.tasks}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {user._count.memberships}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Details Sidebar */}
        <div>
          {selectedUser ? (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-5 sticky top-20">
              <div className="flex items-center gap-3 pb-3 border-b border-border/70">
                <Avatar className="size-12 border border-border shrink-0">
                  <AvatarImage src={selectedUser.image || ""} />
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                    {selectedUser.name?.[0] || selectedUser.email[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {selectedUser.name || "Unnamed User"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Joined {format(new Date(selectedUser.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Statistics grid */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                  <p className="text-base font-semibold text-foreground">{userStats?.tasks || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Tasks</p>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                  <p className="text-base font-semibold text-foreground">{userStats?.groceries || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Groceries</p>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                  <p className="text-base font-semibold text-foreground">{userStats?.transactions || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Transactions</p>
                </div>
                <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                  <p className="text-base font-semibold text-foreground">{userStats?.groups || 0}</p>
                  <p className="text-[11px] text-muted-foreground">Groups</p>
                </div>
              </div>

              {/* Group Memberships */}
              {userGroups.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-medium text-foreground">Group Memberships</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {userGroups.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/60 text-xs"
                      >
                        <span className="font-medium text-foreground truncate">{m.group.name}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {m.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="grid grid-cols-2 gap-2">
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                        <Pencil className="size-3 mr-1.5" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-5 rounded-xl border border-border bg-card">
                      <DialogHeader className="pb-2">
                        <DialogTitle className="text-base font-semibold">Edit User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdateUser} className="space-y-3.5 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">Full Name</Label>
                          <Input
                            value={editUser.name}
                            onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">Email</Label>
                          <Input
                            type="email"
                            value={editUser.email}
                            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditOpen(false)}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={updating} className="h-8 text-xs">
                            {updating ? <Loader2 className="size-3.5 animate-spin" /> : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                        <Key className="size-3 mr-1.5" /> Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-5 rounded-xl border border-border bg-card">
                      <DialogHeader className="pb-2">
                        <DialogTitle className="text-base font-semibold">Reset Password</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3.5 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">New Password</Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="h-8 text-xs"
                            minLength={6}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPasswordOpen(false)}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleResetPassword}
                            disabled={newPassword.length < 6}
                            className="h-8 text-xs"
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={() => handleDeactivate(selectedUser.id)}
                  >
                    <RotateCcw className="size-3 mr-1.5" /> Deactivate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(selectedUser.id)}
                  >
                    <Trash2 className="size-3 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card/60 p-8 text-center text-xs text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 text-muted-foreground/60" />
              Select a user to review details and manage credentials.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
