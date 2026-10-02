import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const palette = ["#06b6d4", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

export function ReportChart({
  title,
  data,
  type = "area",
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  type?: "area" | "bar" | "pie";
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#06b6d4" />
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="reportFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="url(#reportFill)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
