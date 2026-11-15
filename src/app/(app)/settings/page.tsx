import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserProfile, getUserGroups, getUserInvitations } from "@/lib/actions/user";
import { Settings, User, Shield, Package, ShoppingCart, Banknote, ListTodo, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ProfileForm } from "./components/ProfileForm";
import { PasswordForm } from "./components/PasswordForm";
import { DeleteAccountButton } from "./components/DeleteAccountButton";
import { CategorySettings } from "./components/CategorySettings";
import { getCategories } from "@/lib/actions/finance";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getUserProfile();
  const categories = await getCategories();

  if (!profile) return null;

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Settings</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              Account & System
            </span>
          </div>
          <p>
            Manage your personal profile, security credentials, and organization categories.
          </p>
        </div>
      </div>

      {/* User Overview Galley Profile Card */}
      <div className="galley-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-rule shadow-md">
              <AvatarImage src={profile.image || ""} />
              <AvatarFallback className="bg-gradient-to-br from-[#dde5ee] to-[#8ea2b7] text-[#17222e] font-bold text-xl">
                {profile.name?.[0] || profile.email[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-foreground">{profile.name || "User"}</h2>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground/80 font-mono">
                Member since {format(new Date(profile.createdAt), "MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Galley Stat Strip for Activity */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">TASKS RECORDED</span>
          <b className="stat-val">{profile._count.tasks}</b>
          <small className="stat-sub">Across household lists</small>
        </div>

        <div>
          <span className="stat-label">GROCERY ITEMS</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400">{profile._count.groceryItems}</b>
          <small className="stat-sub">Tracked shopping needs</small>
        </div>

        <div>
          <span className="stat-label">TRANSACTIONS</span>
          <b className="stat-val text-amber-500">{profile._count.transactions}</b>
          <small className="stat-sub">Logged ledger items</small>
        </div>

        <div>
          <span className="stat-label">GROUPS JOINED</span>
          <b className="stat-val text-sky-500">{profile._count.memberships}</b>
          <small className="stat-sub">Active household spaces</small>
        </div>
      </div>

      {/* Profile & Security Forms Grid in Galley Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="galley-card space-y-4">
          <div className="border-b border-rule pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" /> Profile Details
            </h2>
            <p className="text-xs text-muted-foreground">Update your public display name</p>
          </div>
          <ProfileForm name={profile.name || ""} email={profile.email} />
        </div>

        <div className="galley-card space-y-4">
          <div className="border-b border-rule pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-primary" /> Security & Password
            </h2>
            <p className="text-xs text-muted-foreground">Manage your secret login credentials</p>
          </div>
          <PasswordForm />
        </div>
      </div>

      {/* Category Management */}
      <div className="galley-card">
        <CategorySettings initialCategories={categories} />
      </div>

      {/* Danger Zone */}
      <div className="galley-card border-destructive/20 bg-destructive/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Delete Account
            </h3>
            <p className="text-xs text-muted-foreground">
              Permanently close your account and remove associated personal data.
            </p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
