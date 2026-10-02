import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function LogsSettingsPage() {
  const auditLogsQuery = trpc.settings.getLogs.useQuery();

  return (
    <AdminShell title="Logs Settings" description="Review recent audit events and operational logs">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Audit Trail</CardTitle>
          <CardDescription className="text-slate-400">Inspect the most recent system activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogsQuery.data?.length ? auditLogsQuery.data.map((entry: any) => (
            <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{entry.action ?? "System event"}</span>
                <span className="text-slate-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</span>
              </div>
              <p className="mt-1 text-slate-400">{entry.details ?? "No additional details"}</p>
            </div>
          )) : <p className="text-slate-400">No audit logs available yet.</p>}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
