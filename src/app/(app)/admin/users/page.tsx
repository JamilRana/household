"use client";

import { useState, useEffect } from "react";
import { Users, Search, Shield, Mail, Calendar, Package, ShoppingCart, Banknote, ListTodo, MoreVertical, AlertTriangle, Plus, Loader2, X, Eye, Pencil, Trash2, RotateCcw, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAllUsersAdmin, getUserStats, getUserGroupsAdmin, deactivateUser, createUser, updateUser, deleteUser, reactivateUser, resetUserPassword, getDeactivatedUsers } from "@/lib/actions/admin";
import { format } from "date-fns";
import { toast } from "sonner";

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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [data, deactivated] = await Promise.all([
        getAllUsersAdmin(),
        getDeactivatedUsers()
      ]);
      setUsers(data);
      setDeactivatedUsers(deactivated);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: UserStats) => {
    setSelectedUser(user);
    setEditUser({ name: user.name || "", email: user.email });
    try {
      const [stats, groups] = await Promise.all([
        getUserStats(user.id),
        getUserGroupsAdmin(user.id)
      ]);
      setUserStats(stats);
      setUserGroups(groups);
    } catch (err: any) {
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
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
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
    if (!confirm("Are you sure you want to deactivate this user? They will no longer be able to log in.")) return;
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
    if (!confirm("⚠️ PERMANENT: This will permanently delete the user and ALL their data. This cannot be undone!")) return;
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

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-none shadow-xl bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-rose-600">Access Denied</h2>
            <p className="text-rose-500/70 font-medium mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-violet-400/5 blur-[120px] rounded-full" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-5 rounded-3xl shadow-xl shadow-violet-200 dark:shadow-none">
            <Users className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight">User Directory</h1>
            <p className="text-muted-foreground text-lg font-bold flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-violet-500" />
              Manage system users and permissions
            </p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 font-black rounded-2xl h-12 px-6">
              <Plus className="h-5 w-5 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Full Name</Label>
                <Input 
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="h-12 rounded-xl font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Email</Label>
                <Input 
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  className="h-12 rounded-xl font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Password</Label>
                <Input 
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="h-12 rounded-xl font-bold"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="flex-1 h-12 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold">
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Total Users</p>
            <h3 className="text-3xl font-black mt-2">{users.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Total Tasks</p>
            <h3 className="text-3xl font-black mt-2">{users.reduce((a, u) => a + u._count.tasks, 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Total Groups</p>
            <h3 className="text-3xl font-black mt-2">{users.reduce((a, u) => a + u._count.memberships, 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">New This Month</p>
            <h3 className="text-3xl font-black mt-2">
              {users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-6">
            <p className="text-rose-500 font-black uppercase tracking-widest text-xs">Deactivated</p>
            <h3 className="text-3xl font-black mt-2 text-rose-500">{deactivatedUsers.length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Deactivated Users Banner */}
      {deactivatedUsers.length > 0 && (
        <Card className="border-none shadow-lg bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <span className="font-bold text-rose-700 dark:text-rose-300">{deactivatedUsers.length} deactivated users</span>
            <div className="flex gap-2 ml-auto">
              {deactivatedUsers.slice(0, 3).map(u => (
                <Button key={u.id} variant="ghost" size="sm" onClick={() => handleReactivate(u.id)} className="text-xs font-bold text-rose-600 hover:bg-rose-100">
                  <RotateCcw className="h-3 w-3 mr-1" /> {u.name || u.email}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <Input 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-12 rounded-2xl border-none bg-white dark:bg-slate-900 shadow-lg font-bold"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-medium">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">No users found</div>
            ) : (
              filteredUsers.map(user => (
                <Card 
                  key={user.id} 
                  className={`border-none shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                    selectedUser?.id === user.id 
                      ? "ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20" 
                      : "bg-white dark:bg-slate-900"
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback className="bg-violet-100 text-violet-600 font-black">
                        {user.name?.[0] || user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black truncate">{user.name || "Unnamed User"}</h3>
                      <p className="text-sm text-slate-500 font-medium truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3" />
                        {user._count.tasks}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {user._count.memberships}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-4">
          {selectedUser ? (
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 sticky top-8">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.image || ""} />
                    <AvatarFallback className="bg-violet-100 text-violet-600 text-xl font-black">
                      {selectedUser.name?.[0] || selectedUser.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-black">{selectedUser.name || "Unnamed User"}</h3>
                    <p className="text-sm text-slate-500 font-medium">{selectedUser.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Calendar className="h-4 w-4" />
                  Joined {format(new Date(selectedUser.createdAt), "MMMM d, yyyy")}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <ListTodo className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-black">{userStats?.tasks || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tasks</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <ShoppingCart className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                    <p className="text-2xl font-black">{userStats?.groceries || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Groceries</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <Banknote className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-2xl font-black">{userStats?.transactions || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Transactions</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                    <Users className="h-5 w-5 mx-auto text-violet-500 mb-1" />
                    <p className="text-2xl font-black">{userStats?.groups || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Groups</p>
                  </div>
                </div>

                {userGroups.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Group Memberships</h4>
                    <div className="space-y-2">
                      {userGroups.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-lg">
                              {m.group.icon || "👥"}
                            </div>
                            <span className="font-bold text-sm">{m.group.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-black">
                            {m.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-xl font-bold">
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] p-6 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Edit User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400">Full Name</Label>
                            <Input 
                              value={editUser.name}
                              onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                              className="h-12 rounded-xl font-bold"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400">Email</Label>
                            <Input 
                              type="email"
                              value={editUser.email}
                              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                              className="h-12 rounded-xl font-bold"
                              required
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="flex-1 h-12 rounded-xl font-bold">
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updating} className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold">
                              {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-xl font-bold">
                          <Key className="h-4 w-4 mr-2" /> Reset Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[2rem] p-6 border-none shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Reset Password</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400">New Password</Label>
                            <Input 
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              className="h-12 rounded-xl font-bold"
                              minLength={6}
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)} className="flex-1 h-12 rounded-xl font-bold">
                              Cancel
                            </Button>
                            <Button onClick={handleResetPassword} disabled={newPassword.length < 6} className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold">
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
                      className="rounded-xl font-bold text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => handleDeactivate(selectedUser.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Deactivate
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-xl font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleDelete(selectedUser.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Select a user to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}