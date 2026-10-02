export type PcManagementStatus = "available" | "in_use" | "reserved" | "offline";

export type PcManagementRecord = {
  id: number;
  pcNumber?: number | null;
  pcName?: string | null;
  status?: string | null;
  currentCustomer?: string | null;
  remainingTime?: string | null;
  currentSession?: string | null;
  hourlyRate?: string | number | null;
  lastActivity?: string | Date | null;
  isActive?: boolean | null;
};

export const PC_STATUS_OPTIONS: PcManagementStatus[] = ["available", "in_use", "reserved", "offline"];

export function normalizePcManagementStatus(status: string | null | undefined): PcManagementStatus {
  const normalized = (status ?? "offline").toString().trim().toLowerCase();
  switch (normalized) {
    case "available":
      return "available";
    case "in use":
    case "in_use":
    case "busy":
      return "in_use";
    case "reserved":
      return "reserved";
    case "offline":
    default:
      return "offline";
  }
}

export function getPcDashboardStats(pcs: Array<Pick<PcManagementRecord, "status" | "isActive">>): {
  totalPCs: number;
  availablePCs: number;
  inUsePCs: number;
  offlinePCs: number;
} {
  return pcs.reduce(
    (stats, pc) => {
      const normalizedStatus = normalizePcManagementStatus(pc.status ?? "offline");
      stats.totalPCs += 1;
      if (normalizedStatus === "available") stats.availablePCs += 1;
      if (normalizedStatus === "in_use") stats.inUsePCs += 1;
      if (normalizedStatus === "offline" || pc.isActive === false) stats.offlinePCs += 1;
      return stats;
    },
    { totalPCs: 0, availablePCs: 0, inUsePCs: 0, offlinePCs: 0 }
  );
}
