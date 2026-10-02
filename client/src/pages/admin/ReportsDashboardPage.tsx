import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';

export default function ReportsDashboardPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [staff, setStaff] = useState("");
  const [customer, setCustomer] = useState("");
  const [pc, setPc] = useState("");
  const [product, setProduct] = useState("");
  const [service, setService] = useState("");

  const overviewQuery = trpc.reports.overview.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    staff: staff || undefined,
    customer: customer || undefined,
    pc: pc || undefined,
    product: product || undefined,
    service: service || undefined,
  });

  const stats = overviewQuery.data ?? {} as any;

  const settingsQuery = useSettings();
  const summaryCards = useMemo(() => [
    { title: "Today's Revenue", value: formatCurrency(Number(stats.todayRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Weekly Revenue", value: formatCurrency(Number(stats.weeklyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Monthly Revenue", value: formatCurrency(Number(stats.monthlyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Yearly Revenue", value: formatCurrency(Number(stats.yearlyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Active Sessions", value: stats.activeSessions ?? 0 },
    { title: "Total Customers", value: stats.totalCustomers ?? 0 },
    { title: "Products Sold", value: stats.totalProductsSold ?? 0 },
    { title: "Printing Revenue", value: formatCurrency(Number(stats.printingRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Inventory Value", value: formatCurrency(Number(stats.inventoryValue ?? 0), settingsQuery.data?.general?.currency) },
    { title: "Profit Summary", value: formatCurrency(Number(stats.profitSummary ?? 0), settingsQuery.data?.general?.currency) },
  ], [stats, settingsQuery.data]);

  const revenueTrendData = useMemo(() => ((stats.revenueTrend ?? []) as any[]).map((entry) => ({ name: entry.label, value: Number(entry.revenue ?? 0) })), [stats.revenueTrend]);
  const customerGrowthData = useMemo(() => ((stats.customerGrowth ?? []) as any[]).map((entry) => ({ name: entry.label, value: Number(entry.customers ?? 0) })), [stats.customerGrowth]);
  const productSalesData = useMemo(() => ((stats.productSales ?? []) as any[]).map((entry) => ({ name: entry.name, value: Number(entry.sold ?? 0) })), [stats.productSales]);

  const exportRows = useMemo(() => [
    { Metric: "Today's Revenue", Value: formatCurrency(Number(stats.todayRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { Metric: "Weekly Revenue", Value: formatCurrency(Number(stats.weeklyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { Metric: "Monthly Revenue", Value: formatCurrency(Number(stats.monthlyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { Metric: "Yearly Revenue", Value: formatCurrency(Number(stats.yearlyRevenue ?? 0), settingsQuery.data?.general?.currency) },
    { Metric: "Active Sessions", Value: stats.activeSessions ?? 0 },
    { Metric: "Total Customers", Value: stats.totalCustomers ?? 0 },
    { Metric: "Print Jobs", Value: stats.totalPrintJobs ?? 0 },
  ], [stats, settingsQuery.data]);

  return (
    <AdminShell title="Reports & Analytics" description="Executive reporting for revenue, sessions, customers, inventory, and printing">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>Filters</span>
              <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => { setStartDate(""); setEndDate(""); setStaff(""); setCustomer(""); setPc(""); setProduct(""); setService(""); }}>
                Reset
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-6">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start Date" className="border-slate-700 bg-slate-950" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End Date" className="border-slate-700 bg-slate-950" />
            <Input value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="Staff" className="border-slate-700 bg-slate-950" />
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" className="border-slate-700 bg-slate-950" />
            <Input value={pc} onChange={(e) => setPc(e.target.value)} placeholder="PC" className="border-slate-700 bg-slate-950" />
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product" className="border-slate-700 bg-slate-950" />
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service" className="border-slate-700 bg-slate-950" />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-300">Dashboard Analytics</Badge>
            <Badge className="bg-slate-700 text-slate-200">Interactive Report Views</Badge>
          </div>
          <ExportButtons reportName="cyber-cafe-analytics-overview" rows={exportRows} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <ReportCard key={item.title} title={item.title} value={item.value} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChart title="Revenue Trend" data={revenueTrendData} />
          <ReportChart title="Customer Growth" data={customerGrowthData} type="bar" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChart title="Product Sales" data={productSalesData} type="bar" />
          <ReportChart title="Daily Sessions" data={((stats.dailySessions ?? []) as any[]).map((item) => ({ name: item.label, value: Number(item.sessions ?? 0) }))} />
        </div>
      </div>
    </AdminShell>
  );
}
