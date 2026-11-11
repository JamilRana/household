import { auth } from "@/lib/auth";
import { getUserGroups, getAllUsers } from "@/lib/actions/user";
import { Users, Shield } from "lucide-react";
import { TeamCard } from "./components/TeamCard";
import { CreateTeamModal } from "./components/CreateTeamModal";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const teams = await getUserGroups();
  const allUsers = await getAllUsers();

  const totalMembers = teams.reduce((acc, team) => acc + team.memberCount, 0);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Teams & Households
          </h1>
          <p className="text-sm text-muted-foreground">
            Collaborative household groups and member permissions.
          </p>
        </div>
        <CreateTeamModal />
      </header>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Active teams</span>
          <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-foreground">
            {teams.length}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">Household workspaces</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Total members</span>
          <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-foreground">
            {totalMembers}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">Across all groups</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Registered users</span>
          <div className="mt-2 text-2xl font-semibold font-mono tracking-tight text-foreground">
            {allUsers.length}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">Available to invite</span>
        </div>
      </section>

      {/* Team Cards Grid */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Your teams</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} allUsers={allUsers} />
          ))}
          {teams.length === 0 && (
            <div className="sm:col-span-2 py-12 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">
              You are not a member of any teams yet. Create a team to share tasks, lists, and finances.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
