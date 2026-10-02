import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  accent?: string;
};

export function StatCard({ title, value, detail, icon, accent = "text-cyan-400" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-slate-950/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl bg-slate-800 p-2 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}
