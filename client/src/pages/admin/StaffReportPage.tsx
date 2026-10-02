import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function StaffReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const staffQuery = trpc.reports.staff.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const staffReport = staffQuery.data ?? ({} as any);

  const exportRows = useMemo(() => [
    { Metric: "Sales by Staff", Value: (staffReport.salesByStaff ?? []).length },
    { Metric: "Sessions Managed", Value: staffReport.sessionsManaged ?? 0 },
    { Metric: "Printing Jobs Handled", Value: staffReport.printingJobsHandled ?? 0 },
  ], [staffReport]);

  return (
    <AdminShell title="Staff Report" description="Measure sales contribution, session oversight, and print handling productivity">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>Date Range Filter</span>
              <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => { setStartDate(""); setEndDate(""); }}>
                Reset
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-slate-700 bg-slate-950" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-slate-700 bg-slate-950" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <ExportButtons reportName="cyber-cafe-staff-report" rows={exportRows} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ReportCard title="Sales by Staff" value={(staffReport.salesByStaff ?? []).length} detail="Team contributors" />
          <ReportCard title="Sessions Managed" value={staffReport.sessionsManaged ?? 0} />
          <ReportCard title="Printing Jobs Handled" value={staffReport.printingJobsHandled ?? 0} />
        </div>

        <ReportChart title="Staff Performance" data={((staffReport.performanceSummary ?? []) as any[]).map((item) => ({ name: item.staffName, value: Number(item.sales ?? 0) }))} type="bar" />
      </div>
    </AdminShell>
  );
}
