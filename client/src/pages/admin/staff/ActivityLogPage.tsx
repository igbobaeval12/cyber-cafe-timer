import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function ActivityLogPage() {
  const activityQuery = trpc.staffs.activityLogs.useQuery();
  const items = activityQuery.data ?? [];

  return (
    <AdminShell title="Activity Log" description="Review staff actions and system events">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-slate-400">Audited actions taken by staff members.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Details</th>
                  <th className="px-3 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-800/80 text-slate-300 last:border-b-0">
                    <td className="px-3 py-3">{item.action}</td>
                    <td className="px-3 py-3">{item.details ?? "-"}</td>
                    <td className="px-3 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
