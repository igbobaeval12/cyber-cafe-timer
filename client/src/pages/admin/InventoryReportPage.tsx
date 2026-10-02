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

export default function InventoryReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const inventoryQuery = trpc.reports.inventory.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const inventoryReport = inventoryQuery.data ?? {} as any;

  return (
    <AdminShell title="Inventory Report" description="Review stock health, sales momentum, and transaction activity">
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
          <ExportButtons reportName="cyber-cafe-inventory-report" rows={[
            { Metric: "Current Stock", Value: inventoryReport.currentStock ?? 0 },
            { Metric: "Low Stock Items", Value: (inventoryReport.lowStockItems ?? []).length },
            { Metric: "Out of Stock Items", Value: (inventoryReport.outOfStockItems ?? []).length },
          ]} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ReportCard title="Current Stock" value={inventoryReport.currentStock ?? 0} />
          <ReportCard title="Low Stock Items" value={(inventoryReport.lowStockItems ?? []).length} />
          <ReportCard title="Out of Stock Items" value={(inventoryReport.outOfStockItems ?? []).length} />
          <ReportCard title="Inventory Value" value={formatCurrency(inventoryReport.inventoryValue)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChart title="Best Selling Products" data={((inventoryReport.bestSellingProducts ?? []) as any[]).map((item) => ({ name: item.name, value: Number(item.sold ?? 0) }))} type="bar" />
          <ReportChart title="Inventory Transactions" data={((inventoryReport.inventoryTransactions ?? []) as any[]).map((item) => ({ name: item.transactionType, value: Number(item.quantity ?? 0) }))} type="pie" />
        </div>
      </div>
    </AdminShell>
  );
}
