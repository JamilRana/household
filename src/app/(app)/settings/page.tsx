import { auth } from "@/lib/auth";
import { getUserProfile, getUserGroups, getUserInvitations } from "@/lib/actions/user";
import { Settings, User, Shield, Bell, Home, ChevronRight, Package, ShoppingCart, Banknote, ListTodo, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import Link from "next/link";
import { ProfileForm } from "./components/ProfileForm";
import { PasswordForm } from "./components/PasswordForm";
import { GroupCard } from "./components/GroupCard";
import { GroupInvitations } from "./components/GroupInvitations";
import { DeleteAccountButton } from "./components/DeleteAccountButton";
import { CategorySettings } from "./components/CategorySettings";
import { PantryCategorySettings } from "./components/PantryCategorySettings";
import { getCategories } from "@/lib/actions/finance";
import { getPantryCategories } from "@/lib/actions/groceries";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const profile = await getUserProfile();
  const groups = await getUserGroups();
  const invitations = await getUserInvitations();
  const categories = await getCategories();
  const pantryCategories = await getPantryCategories();

  if (!profile) return null;

  return (
    <div className="p-8 space-y-12 max-w-5xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] bg-violet-400/5 blur-[120px] rounded-full" />

      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="bg-violet-100 dark:bg-violet-900/30 p-4 rounded-3xl shadow-inner border border-violet-50 dark:border-violet-800">
          <Settings className="h-8 w-8 text-violet-600" />
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-lg font-bold">Manage your account and preferences.</p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <User className="h-48 w-48 rotate-12" />
        </div>
        <CardContent className="p-8 flex items-center gap-8">
          <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
            <AvatarImage src={profile.image || ""} />
            <AvatarFallback className="bg-violet-600 text-white text-3xl font-black">
              {profile.name?.[0] || profile.email[0]}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h2 className="text-3xl font-black">{profile.name || "User"}</h2>
            <p className="text-violet-300/80 font-bold">{profile.email}</p>
            <p className="text-violet-400/60 text-sm font-bold">
              Member since {format(new Date(profile.createdAt), "MMMM yyyy")}
            </p>
          </div>
        </CardContent>
        {/* Stats bar */}
        <div className="bg-white/5 backdrop-blur px-8 py-4 flex gap-8 border-t border-white/10">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-black">{profile._count.tasks}</span>
            <span className="text-xs text-violet-300/60 font-bold">Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-black">{profile._count.groceryItems}</span>
            <span className="text-xs text-violet-300/60 font-bold">Items</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-black">{profile._count.transactions}</span>
            <span className="text-xs text-violet-300/60 font-bold">Transactions</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-black">{profile._count.pantryItems}</span>
            <span className="text-xs text-violet-300/60 font-bold">Pantry</span>
          </div>
        </div>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
            <User className="h-4 w-4" /> Profile
          </h2>
          <ProfileForm name={profile.name || ""} email={profile.email} />
        </div>

        {/* Security */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
            <Shield className="h-4 w-4" /> Security
          </h2>
          <PasswordForm />
        </div>
      </div>

      {/* Groups 
      <div className="space-y-10">
        <GroupInvitations invitations={invitations} />
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
              <Home className="h-4 w-4" /> My Groups
            </h2>
          </div>
        <div className="grid gap-6 md:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
          <GroupCard group={null} />
        </div>
        </div>
      </div>*/}

      {/* Categories Management */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <CategorySettings initialCategories={categories} />
        </div>
        <div className="space-y-6">
          <PantryCategorySettings initialCategories={pantryCategories} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2 px-1">
          ⚠ Danger Zone
        </h2>
        <Card className="border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/10 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-black text-rose-900 dark:text-rose-100">Delete Account</h3>
              <p className="text-sm text-rose-600/70 font-medium">Permanently remove your account and all data. This cannot be undone.</p>
            </div>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
