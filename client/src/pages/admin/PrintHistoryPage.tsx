import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function PrintHistoryPage() {
  const historyQuery = trpc.printJobs.getHistory.useQuery({ limit: 50 });
  const history = (historyQuery.data ?? []) as any[];

  return (
    <AdminShell title="Print History" description="Completed and cancelled printing records">
      <div className="space-y-4">
        {history.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardContent className="p-6 text-sm text-slate-400">No print history available.</CardContent>
          </Card>
        ) : (
          history.map((job) => (
            <Card key={job.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{job.jobName}</span>
                  <Badge className={job.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}>{job.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <p>{job.serviceName} • {job.paperSize} • {job.printType}</p>
                <p>{new Date(job.createdAt).toLocaleString()} • Total: {formatCurrency(job.totalCost)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminShell>
  );
}
