import { useRoute } from "wouter";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function PrintJobDetailsPage() {
  const [, params] = useRoute("/admin/printing/:id");
  const jobId = Number(params?.id ?? 0);
  const jobQuery = trpc.printJobs.getById.useQuery({ jobId }, { enabled: Boolean(jobId) });
  const job = jobQuery.data as any;

  return (
    <AdminShell title="Print Job Details" description="Inspect service details, pricing, and status">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{job?.jobName ?? `Job #${jobId}`}</span>
              <Badge className="bg-cyan-500/15 text-cyan-300">{job?.status ?? "pending"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
            <p>Service: {job?.serviceName ?? "—"}</p>
            <p>Paper: {job?.paperSize ?? "A4"}</p>
            <p>Print Type: {job?.printType ?? "single_sided"}</p>
            <p>Color: {job?.colorOption ?? "black_white"}</p>
            <p>Pages: {job?.pageCount ?? 0}</p>
            <p>Quantity: {job?.quantity ?? 1}</p>
            <p>Unit Price: {formatCurrency(job?.unitPrice)}</p>
            <p>Total: {formatCurrency(job?.totalCost)}</p>
            <p className="md:col-span-2">Notes: {job?.notes ?? "—"}</p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
    </AdminShell>
  );
}
