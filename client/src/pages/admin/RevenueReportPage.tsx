import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function RevenueReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [staff, setStaff] = useState("");
  const [customer, setCustomer] = useState("");
  const [pc, setPc] = useState("");
  const [product, setProduct] = useState("");
  const [service, setService] = useState("");
  const revenueQuery = trpc.reports.revenue.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined, staff: staff || undefined, customer: customer || undefined, pc: pc || undefined, product: product || undefined, service: service || undefined });
  const revenue = revenueQuery.data ?? {} as any;

  const exportRows = useMemo(() => [
    { Period: "Today", Revenue: formatCurrency(revenue.summary?.todayRevenue) },
    { Period: "Week", Revenue: formatCurrency(revenue.summary?.weeklyRevenue) },
    { Period: "Month", Revenue: formatCurrency(revenue.summary?.monthlyRevenue) },
    { Period: "Year", Revenue: formatCurrency(revenue.summary?.yearlyRevenue) },
  ], [revenue]);

  return (
    <AdminShell title="Revenue Report" description="Track daily, weekly, monthly, yearly, and custom range revenue totals">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>Custom Date Range</span>
              <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => { setStartDate(""); setEndDate(""); setStaff(""); setCustomer(""); setPc(""); setProduct(""); setService(""); }}>
                Reset
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-slate-700 bg-slate-950" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-slate-700 bg-slate-950" />
            <Input value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="Staff" className="border-slate-700 bg-slate-950" />
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" className="border-slate-700 bg-slate-950" />
            <Input value={pc} onChange={(e) => setPc(e.target.value)} placeholder="PC" className="border-slate-700 bg-slate-950" />
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product" className="border-slate-700 bg-slate-950" />
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service" className="border-slate-700 bg-slate-950" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <ExportButtons reportName="cyber-cafe-revenue-report" rows={exportRows} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ReportCard title="Today's Revenue" value={formatCurrency(revenue.summary?.todayRevenue)} />
          <ReportCard title="Weekly Revenue" value={formatCurrency(revenue.summary?.weeklyRevenue)} />
          <ReportCard title="Monthly Revenue" value={formatCurrency(revenue.summary?.monthlyRevenue)} />
          <ReportCard title="Yearly Revenue" value={formatCurrency(revenue.summary?.yearlyRevenue)} />
        </div>

        <ReportChart title="Revenue Trend" data={((revenue.trend ?? []) as any[]).map((item) => ({ name: item.label, value: Number(item.revenue ?? 0) }))} />
      </div>
    </AdminShell>
  );
}
