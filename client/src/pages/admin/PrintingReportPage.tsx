import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function PrintingReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const printingQuery = trpc.reports.printing.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const printingReport = printingQuery.data ?? {} as any;

  return (
    <AdminShell title="Printing Report" description="Inspect print volume, color mix, service demand, and revenue contribution">
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
          <ExportButtons reportName="cyber-cafe-printing-report" rows={[
            { Metric: "Total Print Jobs", Value: printingReport.totalPrintJobs ?? 0 },
            { Metric: "Color Prints", Value: printingReport.colorPrints ?? 0 },
            { Metric: "Black & White Prints", Value: printingReport.blackWhitePrints ?? 0 },
          ]} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ReportCard title="Total Print Jobs" value={printingReport.totalPrintJobs ?? 0} />
          <ReportCard title="Color Prints" value={printingReport.colorPrints ?? 0} />
          <ReportCard title="Black & White Prints" value={printingReport.blackWhitePrints ?? 0} />
          <ReportCard title="Printing Revenue" value={formatCurrency(printingReport.printingRevenue)} />
        </div>

        <ReportChart title="Most Requested Services" data={((printingReport.mostRequestedServices ?? []) as any[]).map((item) => ({ name: item.serviceName, value: Number(item.count ?? 0) }))} type="pie" />
      </div>
    </AdminShell>
  );
}
