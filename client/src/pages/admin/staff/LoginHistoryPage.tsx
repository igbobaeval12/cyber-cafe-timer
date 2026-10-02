import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function LoginHistoryPage() {
  const historyQuery = trpc.staffs.loginHistory.useQuery({ id: 1 });
  const items = historyQuery.data ?? [];

  return (
    <AdminShell title="Login History" description="Review recent staff sign-ins and access attempts">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Recent Sign-ins</CardTitle>
          <CardDescription className="text-slate-400">Authentication events for staff accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">IP Address</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-800/80 text-slate-300 last:border-b-0">
                    <td className="px-3 py-3">{new Date(item.loginAt).toLocaleString()}</td>
                    <td className="px-3 py-3">{item.success ? "Success" : "Failed"}</td>
                    <td className="px-3 py-3">{item.ipAddress ?? "-"}</td>
                    <td className="px-3 py-3">{item.details ?? "-"}</td>
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
