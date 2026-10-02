import { describe, it, expect } from 'vitest';
import { createReportOverview, countSoldUnits } from './_core/reports';

describe('Reports analytics aggregation', () => {
  it('builds a dashboard summary from raw revenue and session records', () => {
    const summary = createReportOverview({
      revenueRecords: [
        { totalAmount: 45, createdAt: new Date('2026-07-21T09:00:00Z') },
        { totalAmount: 25, createdAt: new Date('2026-07-21T13:00:00Z') },
        { totalAmount: 95, createdAt: new Date('2026-07-20T11:00:00Z') },
      ],
      sessionRecords: [
        { totalDurationMinutes: 120, sessionStatus: 'active' },
        { totalDurationMinutes: 65, sessionStatus: 'completed' },
      ],
      customerRecords: [
        { membershipTier: 'vip' },
        { membershipTier: 'regular' },
        { membershipTier: 'vip' },
      ],
      productSales: [
        { totalAmount: 24 },
        { totalAmount: 31 },
      ],
      inventoryValue: 300,
      printingRevenue: 40,
      profitSummary: 65,
    } as any);

    expect(summary.todayRevenue).toBe(70);
    expect(summary.weeklyRevenue).toBe(165);
    expect(summary.monthlyRevenue).toBe(165);
    expect(summary.yearlyRevenue).toBe(165);
    expect(summary.activeSessions).toBe(1);
    expect(summary.vipCustomers).toBe(2);
    expect(summary.inventoryValue).toBe(300);
    expect(summary.profitSummary).toBe(65);
  });

  it('counts sold units from sale items when building the overview', () => {
    const totalProductsSold = countSoldUnits([
      { quantity: 2 },
      { quantity: 3 },
    ]);

    expect(totalProductsSold).toBe(5);
  });
});
