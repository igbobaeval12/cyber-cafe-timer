import { useMemo } from "react";
import { Activity, BarChart3, Monitor, Package, Plus, Receipt, Sparkles, Users, Wallet } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { QuickActionButton } from "@/components/admin/QuickActionButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/currency";

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const dashboardStatsQuery = trpc.computers.dashboardStats.useQuery();
  const activeSessionsQuery = trpc.sessions.getActive.useQuery();
  const historyQuery = trpc.sessions.getHistory.useQuery({ limit: 5 });
  const billingSummaryQuery = trpc.bills.summary.useQuery();

  const activeSessionsCount = activeSessionsQuery.data?.length ?? 0;
  const billingSummary = billingSummaryQuery.data;
  const todaysRevenue = Number(billingSummary?.todayRevenue ?? 0);

  const recentSessions = useMemo(() => {
    return (historyQuery.data ?? []).slice(0, 4).map((session: any) => ({
      id: session.id,
      pc: session.computerName ?? `PC #${session.computerId}`,
      customer: session.userId ? `User #${session.userId}` : "Walk-in",
      start: new Date(session.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      remaining: `${session.totalDurationMinutes ?? 0} min`,
      status: session.sessionStatus === "active" ? "Active" : session.sessionStatus === "paused" ? "Paused" : "Completed",
    }));
  }, [historyQuery.data]);

  const stats = [
    { title: "Total PCs", value: dashboardStatsQuery.data?.totalPCs ?? 0, detail: "Across the café", icon: <Monitor className="h-5 w-5" />, accent: "text-cyan-400" },
    { title: "PCs Available", value: dashboardStatsQuery.data?.availablePCs ?? 0, detail: "Ready for new sessions", icon: <Sparkles className="h-5 w-5" />, accent: "text-emerald-400" },
    { title: "PCs In Use", value: dashboardStatsQuery.data?.inUsePCs ?? 0, detail: "Currently active", icon: <Activity className="h-5 w-5" />, accent: "text-amber-400" },
    { title: "Offline PCs", value: dashboardStatsQuery.data?.offlinePCs ?? 0, detail: "Need attention", icon: <Monitor className="h-5 w-5" />, accent: "text-rose-400" },
    { title: "Active Sessions", value: activeSessionsCount, detail: "Live right now", icon: <Receipt className="h-5 w-5" />, accent: "text-violet-400" },
    { title: "Today\'s Revenue", value: formatCurrency(todaysRevenue), detail: "Updated live", icon: <Wallet className="h-5 w-5" />, accent: "text-emerald-400" },
    { title: "Pending Payments", value: billingSummary?.pendingPayments ?? 0, detail: "Awaiting settlement", icon: <Receipt className="h-5 w-5" />, accent: "text-amber-400" },
    { title: "Recent Transactions", value: billingSummary?.recentTransactions ?? 0, detail: "Completed bills", icon: <BarChart3 className="h-5 w-5" />, accent: "text-violet-400" },
  ];

const quickActions = [
  { title: "Start New Session", description: "Open a new customer session", icon: <Plus className="h-4 w-4" />, path: "/admin/sessions" },
  { title: "Add New PC", description: "Register a new workstation", icon: <Monitor className="h-4 w-4" />, path: "/admin/pcs" },
  { title: "Add Customer", description: "Create a new profile", icon: <Users className="h-4 w-4" />, path: "/admin/customers" },
  { title: "View Reports", description: "Inspect performance", icon: <BarChart3 className="h-4 w-4" />, path: "/admin/reports" },
];

  return (
    <AdminShell title="Dashboard" description="Overview of the café status and activity">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <p className="text-sm text-slate-400">Common tasks</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <QuickActionButton key={action.title} {...action} onClick={() => navigate(action.path)} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-slate-950/30">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
              <p className="text-sm text-slate-400">Live session activity</p>
            </div>
            <button onClick={() => navigate("/admin/sessions")} className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-3 py-3 font-medium">PC Number</th>
                  <th className="px-3 py-3 font-medium">Customer Name</th>
                  <th className="px-3 py-3 font-medium">Start Time</th>
                  <th className="px-3 py-3 font-medium">Remaining Time</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id} className="border-b border-slate-800/80 text-slate-300 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-white">{session.pc}</td>
                    <td className="px-3 py-3">{session.customer}</td>
                    <td className="px-3 py-3">{session.start}</td>
                    <td className="px-3 py-3">{session.remaining}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${session.status === "Active" ? "bg-emerald-500/15 text-emerald-300" : session.status === "Warning" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
