import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserGroups, getAllUsers } from "@/lib/actions/user";
import { Users, Shield, UserCheck } from "lucide-react";
import { TeamCard } from "./components/TeamCard";
import { CreateTeamModal } from "./components/CreateTeamModal";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const teams = await getUserGroups();
  const allUsers = await getAllUsers();

  const totalMembers = teams.reduce((acc, team) => acc + team.memberCount, 0);

  return (
    <div className="w-full space-y-6">
      {/* Galley Page Header */}
      <div className="page-head-galley">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Teams & Households</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              Collaboration
            </span>
          </div>
          <p>
            Collaborative household groups, member invitations, and shared permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <CreateTeamModal />
        </div>
      </div>

      {/* Galley Stat Strip */}
      <div className="stat-strip-galley">
        <div>
          <span className="stat-label">ACTIVE TEAMS</span>
          <b className="stat-val">{teams.length}</b>
          <small className="stat-sub">Your households</small>
        </div>

        <div>
          <span className="stat-label">TOTAL MEMBERS</span>
          <b className="stat-val text-emerald-600 dark:text-emerald-400">{totalMembers}</b>
          <small className="stat-sub">Across all groups</small>
        </div>

        <div>
          <span className="stat-label">REGISTERED USERS</span>
          <b className="stat-val">{allUsers.length}</b>
          <small className="stat-sub">Available collaborators</small>
        </div>
      </div>

      {/* Team Cards Grid in Galley Cards */}
      <section className="space-y-4">
        <div className="border-b border-rule pb-2 px-1">
          <h2 className="text-base font-bold text-foreground">Your Households & Teams</h2>
          <p className="text-xs text-muted-foreground">Manage members, invitations, and active contexts</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="galley-card p-5">
              <TeamCard team={team} allUsers={allUsers} />
            </div>
          ))}
          {teams.length === 0 && (
            <div className="sm:col-span-2 py-16 text-center text-xs text-muted-foreground rounded-2xl border border-rule galley-card">
              You are not a member of any teams yet. Create a team to share tasks, lists, and finances.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
