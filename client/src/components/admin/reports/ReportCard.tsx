import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportCard({
  title,
  value,
  detail,
  className,
}: {
  title: string;
  value: string | number;
  detail?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-slate-800 bg-slate-900/80 text-slate-100", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold text-white">{value}</div>
        {detail ? <p className="text-sm text-slate-400">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
