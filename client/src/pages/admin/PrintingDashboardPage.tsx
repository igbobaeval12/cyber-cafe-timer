import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AdminShell } from "@/components/admin/AdminShell";
import { PrintJobModal } from "@/components/admin/PrintJobModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function PrintingDashboardPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);

  const customersQuery = trpc.customers.search.useQuery({ query: "", limit: 50 });
  const computersQuery = trpc.computers.getAll.useQuery();
  const servicesQuery = trpc.printJobs.services.useQuery();
  const dashboardStatsQuery = trpc.printJobs.dashboardStats.useQuery();
  const jobsQuery = trpc.printJobs.getAll.useQuery({ status: statusFilter === "all" ? undefined : statusFilter as any, search });
  const createJobMutation = trpc.printJobs.create.useMutation({
    onSuccess: async () => {
      setModalOpen(false);
      setEditingJob(null);
      await utils.printJobs.getAll.invalidate();
      await utils.printJobs.dashboardStats.invalidate();
    },
  });
  const updateJobMutation = trpc.printJobs.update.useMutation({
    onSuccess: async () => {
      setModalOpen(false);
      setEditingJob(null);
      await utils.printJobs.getAll.invalidate();
      await utils.printJobs.dashboardStats.invalidate();
    },
  });
  const completeJobMutation = trpc.printJobs.complete.useMutation({
    onSuccess: async () => {
      await utils.printJobs.getAll.invalidate();
      await utils.printJobs.dashboardStats.invalidate();
    },
  });
  const deleteJobMutation = trpc.printJobs.delete.useMutation({
    onSuccess: async () => {
      await utils.printJobs.getAll.invalidate();
      await utils.printJobs.dashboardStats.invalidate();
    },
  });

  const customers = useMemo(() => (customersQuery.data ?? []) as any[], [customersQuery.data]);
  const computers = useMemo(() => (computersQuery.data ?? []) as any[], [computersQuery.data]);
  const services = useMemo(() => (servicesQuery.data ?? []) as any[], [servicesQuery.data]);
  const stats = dashboardStatsQuery.data ?? { pendingJobs: 0, completedToday: 0, printingRevenueToday: 0, activeQueue: 0 };
  const jobs = useMemo(() => (jobsQuery.data ?? []) as any[], [jobsQuery.data]);

  const handleSubmit = (payload: any) => {
    if (editingJob?.id) {
      updateJobMutation.mutate({ jobId: editingJob.id, ...payload });
      return;
    }
    createJobMutation.mutate(payload);
  };

  return (
    <AdminShell title="Printing Services" description="Professional print job management, queue routing, and billing linkage">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="text-sm text-slate-400">Pending Print Jobs</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-white">{stats.pendingJobs}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="text-sm text-slate-400">Completed Jobs Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-white">{stats.completedToday}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="text-sm text-slate-400">Printing Revenue Today</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-white">{formatCurrency(stats.printingRevenueToday)}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="text-sm text-slate-400">Active Print Queue</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold text-white">{stats.activeQueue}</p></CardContent></Card>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search print jobs" className="border-slate-700 bg-slate-950" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="printing">Printing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/printing/queue")}>Queue</Button>
            <Button variant="outline" onClick={() => navigate("/admin/printing/history")}>History</Button>
            <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => { setEditingJob(null); setModalOpen(true); }}>New Print Job</Button>
          </div>
        </div>

        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{job.jobName}</span>
                  <Badge className={job.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : job.status === "cancelled" ? "bg-rose-500/15 text-rose-300" : "bg-cyan-500/15 text-cyan-300"}>{job.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>{job.serviceName} • {job.paperSize} • {job.printType} • {job.colorOption}</p>
                <p>Pages: {job.pageCount} • Qty: {job.quantity} • Unit Price: {formatCurrency(job.unitPrice)} • Total: {formatCurrency(job.totalCost)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/printing/${job.id}`)}>Details</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingJob(job); setModalOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => completeJobMutation.mutate({ jobId: job.id })}>Complete</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteJobMutation.mutate({ jobId: job.id })}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <PrintJobModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialValues={editingJob}
        customers={customers}
        computers={computers}
        services={services}
        onSubmit={handleSubmit}
      />
    </AdminShell>
  );
}
