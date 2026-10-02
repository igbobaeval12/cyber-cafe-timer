import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function PrintQueuePage() {
  const jobsQuery = trpc.printJobs.getAll.useQuery({ status: undefined, search: "" });
  const jobs = (jobsQuery.data ?? []) as any[];

  return (
    <AdminShell title="Print Queue" description="Live print queue and order of pending jobs">
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardContent className="p-6 text-sm text-slate-400">No jobs are currently queued.</CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{job.jobName}</span>
                  <Badge className="bg-cyan-500/15 text-cyan-300">{job.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <p>{job.serviceName} • {job.paperSize} • {job.printType}</p>
                <p>Pages: {job.pageCount} • Qty: {job.quantity} • Total: {formatCurrency(job.totalCost)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminShell>
  );
}
