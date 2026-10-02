import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExportButtons } from "@/components/admin/reports/ExportButtons";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import { ReportChart } from "@/components/admin/reports/ReportChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function SessionReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const sessionQuery = trpc.reports.sessions.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined });
  const sessionReport = sessionQuery.data ?? {} as any;

  return (
    <AdminShell title="Session Report" description="Track session count, duration, usage concentration, and PC demand patterns">
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
          <ExportButtons reportName="cyber-cafe-session-report" rows={[
            { Metric: "Total Sessions", Value: sessionReport.totalSessions ?? 0 },
            { Metric: "Average Session Duration", Value: `${Number(sessionReport.averageSessionDuration ?? 0).toFixed(2)} min` },
            { Metric: "Most Used PC", Value: sessionReport.mostUsedPc?.pcName ?? "N/A" },
          ]} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ReportCard title="Total Sessions" value={sessionReport.totalSessions ?? 0} />
          <ReportCard title="Average Session Duration" value={`${Number(sessionReport.averageSessionDuration ?? 0).toFixed(2)} min`} />
          <ReportCard title="Most Used PC" value={sessionReport.mostUsedPc?.pcName ?? "N/A"} />
          <ReportCard title="Least Used PC" value={sessionReport.leastUsedPc?.pcName ?? "N/A"} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportChart title="PC Usage" data={((sessionReport.pcUsage ?? []) as any[]).map((item) => ({ name: item.pcName, value: Number(item.sessions ?? 0) }))} type="bar" />
          <ReportChart title="Daily Sessions" data={((sessionReport.dailySessions ?? []) as any[]).map((item) => ({ name: item.label, value: Number(item.sessions ?? 0) }))} />
        </div>
      </div>
    </AdminShell>
  );
}
