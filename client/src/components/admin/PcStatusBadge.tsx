type PcStatusBadgeProps = {
  status: string | null | undefined;
};

const statusStyles: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  in_use: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  reserved: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  offline: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

export function PcStatusBadge({ status }: PcStatusBadgeProps) {
  const normalized = (status ?? "offline").toString().trim().toLowerCase();
  const style = statusStyles[normalized] ?? statusStyles.offline;
  const label = normalized === "in_use" ? "In Use" : normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}
