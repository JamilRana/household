import { auth } from "@/lib/auth";
import { getUserGroups, getAllUsers } from "@/lib/actions/user";
import { Users, Plus, Shield, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamCard } from "./components/TeamCard";
import { CreateTeamModal } from "./components/CreateTeamModal";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const teams = await getUserGroups();
  const allUsers = await getAllUsers();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-indigo-400/5 blur-[120px] rounded-full" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none">
            <Users className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Teams</h1>
            <p className="text-muted-foreground text-lg font-bold flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-indigo-500" />
              Manage your collaborative spaces and members.
            </p>
          </div>
        </div>
        <CreateTeamModal />
      </div>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Users className="h-24 w-24 rotate-12" />
          </div>
          <CardContent className="p-8">
            <p className="text-indigo-100 font-black uppercase tracking-widest text-xs">Total Teams</p>
            <h3 className="text-4xl font-black mt-2">{teams.length}</h3>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
          <CardContent className="p-8">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Total Members</p>
            <h3 className="text-4xl font-black mt-2">
              {teams.reduce((acc, team) => acc + team.memberCount, 0)}
            </h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
          <CardContent className="p-8">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Global Directory</p>
            <h3 className="text-4xl font-black mt-2">{allUsers.length + 1}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {teams.length === 0 ? (
          <div className="lg:col-span-2 py-20 text-center space-y-6 bg-white/30 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-10 w-10 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">No teams yet</h3>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Create your first team to start collaborating on tasks, finances, and more.</p>
            </div>
            <CreateTeamModal />
          </div>
        ) : (
          teams.map((team) => (
            <TeamCard key={team.id} team={team} allUsers={allUsers} />
          ))
        )}
      </div>
    </div>
  );
}
