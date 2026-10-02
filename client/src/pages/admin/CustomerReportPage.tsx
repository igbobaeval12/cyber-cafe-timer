import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function CustomerReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const customerQuery = trpc.reports.customers.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const customerReport = customerQuery.data ?? {} as any;

  const exportRows = useMemo(() => [
    { Metric: "New Customers", Value: customerReport.newCustomers ?? 0 },
    { Metric: "Returning Customers", Value: customerReport.returningCustomers ?? 0 },
    { Metric: "VIP Customers", Value: customerReport.vipCustomers ?? 0 },
  ], [customerReport]);

  return (
    <AdminShell title="Customer Report" description="Measure customer acquisition, loyalty, VIP segmentation, and visit patterns">
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
          <ExportButtons reportName="cyber-cafe-customer-report" rows={exportRows} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ReportCard title="New Customers" value={customerReport.newCustomers ?? 0} />
          <ReportCard title="Returning Customers" value={customerReport.returningCustomers ?? 0} />
          <ReportCard title="VIP Customers" value={customerReport.vipCustomers ?? 0} />
          <ReportCard title="Top Spending Customers" value={((customerReport.topSpendingCustomers ?? []).length)} detail="Highlighted segments" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChart title="Customer Growth" data={((customerReport.customerGrowth ?? []) as any[]).map((item) => ({ name: item.label, value: Number(item.customers ?? 0) }))} type="bar" />
          <ReportChart title="Visit Frequency" data={((customerReport.customerVisitFrequency ?? []) as any[]).map((item) => ({ name: item.customerName, value: Number(item.visits ?? 0) }))} type="bar" />
        </div>
      </div>
    </AdminShell>
  );
}
