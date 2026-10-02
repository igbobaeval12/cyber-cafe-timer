import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportReportTable } from "@/lib/reportExport";

export function ExportButtons({
  reportName,
  rows,
}: {
  reportName: string;
  rows: Array<Record<string, string | number | undefined>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => exportReportTable("csv", reportName, rows)}>
        <Download className="mr-2 h-4 w-4" />CSV
      </Button>
      <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => exportReportTable("xlsx", reportName, rows)}>
        <Download className="mr-2 h-4 w-4" />Excel
      </Button>
      <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-100" onClick={() => exportReportTable("pdf", reportName, rows)}>
        <Download className="mr-2 h-4 w-4" />PDF
      </Button>
    </div>
  );
}
