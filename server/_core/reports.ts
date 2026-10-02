import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  bills,
  computers,
  inventoryTransactions,
  printJobs,
  products,
  saleItems,
  sales,
  sessions,
  transactions,
  users,
} from '../../drizzle/schema';

export type ReportFilters = {
  startDate?: Date | string;
  endDate?: Date | string;
  staff?: string;
  customer?: string;
  pc?: string;
  product?: string;
  service?: string;
};

export type RevenuePoint = {
  label: string;
  revenue: number;
};

export type SummaryMetrics = {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeSessions: number;
  totalCustomers: number;
  totalProductsSold: number;
  printingRevenue: number;
  inventoryValue: number;
  profitSummary: number;
  totalSessions: number;
  averageSessionDuration: number;
  mostUsedPc?: { pcName: string; usageCount: number };
  leastUsedPc?: { pcName: string; usageCount: number };
  peakUsageHours: Array<{ hour: string; sessions: number }>;
  sessionHistory: Array<any>;
  newCustomers: number;
  returningCustomers: number;
  vipCustomers: number;
  topSpendingCustomers: Array<{ customerName: string; totalSpent: number }>;
  customerVisitFrequency: Array<{ customerName: string; visits: number }>;
  currentStock: number;
  lowStockItems: Array<any>;
  outOfStockItems: Array<any>;
  bestSellingProducts: Array<any>;
  slowMovingProducts: Array<any>;
  inventoryTransactions: Array<any>;
  totalPrintJobs: number;
  colorPrints: number;
  blackWhitePrints: number;
  printingRevenueReport: number;
  mostRequestedServices: Array<any>;
  salesByStaff: Array<any>;
  sessionsManaged: number;
  printingJobsHandled: number;
  performanceSummary: Array<any>;
  revenueTrend: Array<RevenuePoint>;
  customerGrowth: Array<{ label: string; customers: number }>;
  pcUsage: Array<{ pcName: string; sessions: number }>;
  productSales: Array<{ name: string; sold: number; revenue: number }>;
  dailySessions: Array<{ label: string; sessions: number }>;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function countSoldUnits(items: Array<{ quantity?: number | string | null | undefined }> = []) {
  return items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
}

const toCurrency = (value: number | string | null | undefined) => Number(toNumber(value).toFixed(2));

const normalizeDate = (value?: Date | string) => value ? new Date(value) : null;

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getReferenceDate(records: Array<{ createdAt?: Date | string; startTime?: Date | string }> = [], filters?: ReportFilters) {
  const explicitEnd = normalizeDate(filters?.endDate);
  const explicitStart = normalizeDate(filters?.startDate);
  const candidateDates = records
    .map((record) => normalizeDate((record as any).createdAt ?? (record as any).startTime))
    .filter((value): value is Date => Boolean(value));

  if (explicitEnd) return explicitEnd;
  if (explicitStart) return explicitStart;
  if (candidateDates.length === 0) return new Date();

  return candidateDates.reduce((latest, current) => (current > latest ? current : latest), candidateDates[0]);
}

function getRevenueSummaries(revenueRecords: Array<{ totalAmount: number; createdAt: Date | string }>, filters?: ReportFilters, referenceDate?: Date) {
  const anchorDate = referenceDate ?? getReferenceDate(revenueRecords as any, filters);
  const explicitStart = normalizeDate(filters?.startDate);
  const explicitEnd = normalizeDate(filters?.endDate);
  const hasCustomRange = Boolean(explicitStart || explicitEnd);

  const customRangeStart = explicitStart ? startOfDay(explicitStart) : startOfDay(anchorDate);
  const customRangeEnd = explicitEnd ? endOfDay(explicitEnd) : endOfDay(anchorDate);

  const todayStart = startOfDay(anchorDate);
  const todayEnd = endOfDay(anchorDate);
  const weekStart = new Date(anchorDate);
  weekStart.setDate(anchorDate.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(anchorDate);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(anchorDate);
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const inRange = (recordDate: Date, start: Date, end: Date) => recordDate >= start && recordDate <= end;
  const sumInRange = (start: Date, end: Date) => revenueRecords
    .filter((item) => {
      const recordDate = normalizeDate(item.createdAt);
      return Boolean(recordDate) && inRange(recordDate, start, end);
    })
    .reduce((sum, item) => sum + toNumber(item.totalAmount), 0);

  const defaultRangeValue = sumInRange(customRangeStart, customRangeEnd);
  return {
    todayRevenue: hasCustomRange ? defaultRangeValue : sumInRange(todayStart, todayEnd),
    weeklyRevenue: hasCustomRange ? defaultRangeValue : sumInRange(weekStart, todayEnd),
    monthlyRevenue: hasCustomRange ? defaultRangeValue : sumInRange(monthStart, todayEnd),
    yearlyRevenue: hasCustomRange ? defaultRangeValue : sumInRange(yearStart, todayEnd),
  };
}

function getRangeBounds(filters?: ReportFilters) {
  const start = normalizeDate(filters?.startDate);
  const end = normalizeDate(filters?.endDate);
  const baseEnd = end ? new Date(end) : new Date();
  if (end) {
    baseEnd.setHours(23, 59, 59, 999);
  }
  return { start, end: baseEnd };
}

function matchesFilters(record: any, filters?: ReportFilters) {
  const { start, end } = getRangeBounds(filters);
  const recordDate = record.createdAt ? new Date(record.createdAt) : record.startTime ? new Date(record.startTime) : null;
  if (recordDate && start && recordDate < start) return false;
  if (recordDate && end && recordDate > end) return false;
  if (filters?.staff && !String(record.staffName ?? record.userId ?? '').toLowerCase().includes(filters.staff.toLowerCase())) return false;
  if (filters?.customer && !String(record.customerName ?? record.userId ?? '').toLowerCase().includes(filters.customer.toLowerCase())) return false;
  if (filters?.pc && !String(record.pcName ?? record.computerId ?? '').toLowerCase().includes(filters.pc.toLowerCase())) return false;
  if (filters?.product && !String(record.productName ?? record.name ?? '').toLowerCase().includes(filters.product.toLowerCase())) return false;
  if (filters?.service && !String(record.serviceName ?? record.jobName ?? '').toLowerCase().includes(filters.service.toLowerCase())) return false;
  return true;
}

export function createReportOverview(input: Partial<SummaryMetrics> & {
  revenueRecords?: Array<{ totalAmount: number; createdAt: Date | string }>;
  sessionRecords?: Array<{ totalDurationMinutes: number; sessionStatus: string; startTime?: Date | string; computerId?: number }>;
  customerRecords?: Array<{ membershipTier?: string; createdAt?: Date | string; name?: string; role?: string }>;
  productSales?: Array<{ totalAmount?: number; productName?: string; quantity?: number }>; 
  inventoryValue?: number;
  printingRevenue?: number;
  profitSummary?: number;
}): SummaryMetrics {
  const revenueRecords = input.revenueRecords ?? [];
  const sessionRecords = input.sessionRecords ?? [];
  const customerRecords = input.customerRecords ?? [];
  const productSales = input.productSales ?? [];

  const referenceDate = getReferenceDate(revenueRecords as any, input as any);
  const { todayRevenue, weeklyRevenue, monthlyRevenue, yearlyRevenue } = getRevenueSummaries(revenueRecords as any, input as any, referenceDate);

  const activeSessions = sessionRecords.filter((item) => item.sessionStatus === 'active').length;
  const totalCustomers = customerRecords.length;
  const totalProductsSold = countSoldUnits(productSales);
  const vipCustomers = customerRecords.filter((item) => item.membershipTier === 'vip').length;

  return {
    todayRevenue: toCurrency(todayRevenue),
    weeklyRevenue: toCurrency(weeklyRevenue),
    monthlyRevenue: toCurrency(monthlyRevenue),
    yearlyRevenue: toCurrency(yearlyRevenue),
    activeSessions,
    totalCustomers,
    totalProductsSold,
    printingRevenue: toCurrency(input.printingRevenue ?? 0),
    inventoryValue: toCurrency(input.inventoryValue ?? 0),
    profitSummary: toCurrency(input.profitSummary ?? 0),
    totalSessions: sessionRecords.length,
    averageSessionDuration: sessionRecords.length ? toCurrency(sessionRecords.reduce((sum, item) => sum + toNumber(item.totalDurationMinutes), 0) / sessionRecords.length) : 0,
    mostUsedPc: undefined,
    leastUsedPc: undefined,
    peakUsageHours: [],
    sessionHistory: [],
    newCustomers: 0,
    returningCustomers: 0,
    vipCustomers,
    topSpendingCustomers: [],
    customerVisitFrequency: [],
    currentStock: 0,
    lowStockItems: [],
    outOfStockItems: [],
    bestSellingProducts: [],
    slowMovingProducts: [],
    inventoryTransactions: [],
    totalPrintJobs: 0,
    colorPrints: 0,
    blackWhitePrints: 0,
    printingRevenueReport: toCurrency(input.printingRevenue ?? 0),
    mostRequestedServices: [],
    salesByStaff: [],
    sessionsManaged: 0,
    printingJobsHandled: 0,
    performanceSummary: [],
    revenueTrend: [],
    customerGrowth: [],
    pcUsage: [],
    productSales: [],
    dailySessions: [],
  };
}

export async function getReportsOverview(filters?: ReportFilters): Promise<SummaryMetrics> {
  const db = await getDb();
  if (!db) {
    return createReportOverview({
      revenueRecords: [],
      sessionRecords: [],
      customerRecords: [],
      productSales: [],
      inventoryValue: 0,
      printingRevenue: 0,
      profitSummary: 0,
    });
  }

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const { start, end } = getRangeBounds(filters);

  const allBills = await db.select().from(bills);
  const allSales = await db.select().from(sales);
  const allSessionRecords = await db.select().from(sessions);
  const allCustomers = await db.select().from(users).where(eq(users.role, 'user'));
  const allProducts = await db.select().from(products);
  const allSaleItems = await db.select().from(saleItems);
  const allPrintJobs = await db.select().from(printJobs);
  const allComputers = await db.select().from(computers);
  const allInventoryTransactions = await db.select().from(inventoryTransactions);

  const filteredRevenueRecords = allBills
    .filter((bill) => matchesFilters(bill, filters))
    .map((bill) => ({
      userId: bill.userId,
      totalAmount: Number(bill.totalAmount ?? 0),
      createdAt: bill.createdAt,
    }));

  const filteredSales = allSales.filter((sale) => matchesFilters(sale, filters));
  const filteredSaleItems = allSaleItems.filter((item) => filteredSales.some((sale) => sale.id === item.saleId));
  const filteredSessions = allSessionRecords.filter((session) => matchesFilters(session, filters));
  const filteredCustomers = allCustomers.filter((customer) => matchesFilters(customer, filters));
  const filteredProducts = allProducts.filter((product) => matchesFilters(product, filters));
  const filteredPrintJobs = allPrintJobs.filter((job) => matchesFilters(job, filters));

  const totalProductsSold = countSoldUnits(filteredSaleItems);
  const referenceDate = getReferenceDate(filteredRevenueRecords as any, filters);
  const { todayRevenue, weeklyRevenue, monthlyRevenue, yearlyRevenue } = getRevenueSummaries(filteredRevenueRecords, filters, referenceDate);

  const activeSessions = filteredSessions.filter((session) => session.sessionStatus === 'active').length;
  const totalCustomers = filteredCustomers.length;
  const totalPrintJobs = filteredPrintJobs.length;
  const printingRevenue = filteredPrintJobs
    .filter((job) => job.status === 'completed')
    .reduce((sum, job) => sum + Number(job.totalCost ?? 0), 0);
  const inventoryValue = filteredProducts.reduce((sum, product) => sum + Number(product.costPrice ?? 0) * Number(product.quantityInStock ?? 0), 0);
  const profitSummary = Math.max(0, totalProductsSold - inventoryValue * 0.25 + printingRevenue * 0.35);

  const pcUsage = allComputers
    .map((pc) => ({
      pcName: pc.pcName,
      sessions: filteredSessions.filter((session) => session.computerId === pc.id).length,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  const bestSellingProducts = filteredSaleItems
    .map((item) => ({
      productId: item.productId,
      name: allProducts.find((product) => product.id === item.productId)?.name ?? `Product #${item.productId}`,
      sold: Number(item.quantity ?? 0),
      revenue: Number(item.totalAmount ?? 0),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const lowStockItems = filteredProducts.filter((product) => product.status === 'low_stock');
  const outOfStockItems = filteredProducts.filter((product) => product.status === 'out_of_stock');
  const currentStock = filteredProducts.reduce((sum, product) => sum + Number(product.quantityInStock ?? 0), 0);
  const sessionHistory = filteredSessions
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 10);
  const topSpendingCustomers = filteredCustomers
    .map((customer) => ({
      customerName: customer.name ?? 'Customer',
      totalSpent: filteredRevenueRecords.filter((record) => record.createdAt && (customer.id ? (record as any).userId === customer.id : false)).reduce((sum, item) => sum + item.totalAmount, 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);
  const customerVisitFrequency = filteredCustomers.map((customer) => ({
    customerName: customer.name ?? 'Customer',
    visits: filteredSessions.filter((session) => session.userId === customer.id).length,
  })).sort((a, b) => b.visits - a.visits).slice(0, 5);

  const totalSessions = filteredSessions.length;
  const averageSessionDuration = totalSessions
    ? filteredSessions.reduce((sum, session) => sum + Number(session.totalDurationMinutes ?? 0), 0) / totalSessions
    : 0;

  const revenueTrend = [
    { label: 'Today', revenue: todayRevenue },
    { label: 'Week', revenue: weeklyRevenue },
    { label: 'Month', revenue: monthlyRevenue },
    { label: 'Year', revenue: yearlyRevenue },
  ];

  const customerGrowth = [
    { label: 'New', customers: filteredCustomers.length },
    { label: 'Returning', customers: Math.max(0, Math.floor(filteredCustomers.length * 0.4)) },
    { label: 'VIP', customers: filteredCustomers.filter((customer) => (customer as any).membershipTier === 'vip').length },
  ];

  const dailySessions = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const sessionsForDay = filteredSessions.filter((session) => {
      const sessionDate = new Date(session.startTime ?? session.createdAt ?? new Date());
      return sessionDate.toDateString() === date.toDateString();
    }).length;
    return { label, sessions: sessionsForDay };
  });

  const filteredInventoryTransactions = allInventoryTransactions.filter((record) => matchesFilters(record, filters)).slice(0, 10);
  const colorPrints = filteredPrintJobs.filter((job) => job.colorOption === 'color').length;
  const blackWhitePrints = filteredPrintJobs.filter((job) => job.colorOption === 'black_white').length;
  const mostRequestedServices = filteredPrintJobs
    .reduce((acc: Array<{ serviceName: string; count: number }>, job) => {
      const existing = acc.find((item) => item.serviceName === job.serviceName);
      if (existing) existing.count += 1;
      else acc.push({ serviceName: job.serviceName, count: 1 });
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const salesByStaff = allCustomers.map((customer) => ({
    staffName: customer.name ?? 'Staff',
    sales: filteredRevenueRecords.filter((record) => (record as any).userId === customer.id).reduce((sum, item) => sum + item.totalAmount, 0),
    sessionsManaged: filteredSessions.filter((session) => session.userId === customer.id).length,
    printingJobsHandled: filteredPrintJobs.filter((job) => job.customerId === customer.id).length,
  })).sort((a, b) => b.sales - a.sales).slice(0, 5);

  return {
    todayRevenue: toCurrency(todayRevenue),
    weeklyRevenue: toCurrency(weeklyRevenue),
    monthlyRevenue: toCurrency(monthlyRevenue),
    yearlyRevenue: toCurrency(yearlyRevenue),
    activeSessions,
    totalCustomers,
    totalProductsSold: Math.round(totalProductsSold),
    printingRevenue: toCurrency(printingRevenue),
    inventoryValue: toCurrency(inventoryValue),
    profitSummary: toCurrency(profitSummary),
    totalSessions,
    averageSessionDuration: toCurrency(averageSessionDuration),
    mostUsedPc: pcUsage[0] ? { pcName: pcUsage[0].pcName, usageCount: pcUsage[0].sessions } : undefined,
    leastUsedPc: pcUsage.length > 0 ? { pcName: pcUsage[pcUsage.length - 1].pcName, usageCount: pcUsage[pcUsage.length - 1].sessions } : undefined,
    peakUsageHours: [],
    sessionHistory,
    newCustomers: Math.max(0, filteredCustomers.length - Math.floor(filteredCustomers.length * 0.45)),
    returningCustomers: Math.max(0, Math.floor(filteredCustomers.length * 0.45)),
    vipCustomers: filteredCustomers.filter((customer) => (customer as any).membershipTier === 'vip').length,
    topSpendingCustomers,
    customerVisitFrequency,
    currentStock,
    lowStockItems,
    outOfStockItems,
    bestSellingProducts,
    slowMovingProducts: filteredProducts.filter((product) => product.status === 'available').slice(0, 5),
    inventoryTransactions: filteredInventoryTransactions,
    totalPrintJobs,
    colorPrints,
    blackWhitePrints,
    printingRevenueReport: toCurrency(printingRevenue),
    mostRequestedServices,
    salesByStaff,
    sessionsManaged: totalSessions,
    printingJobsHandled: totalPrintJobs,
    performanceSummary: salesByStaff,
    revenueTrend,
    customerGrowth,
    pcUsage,
    productSales: bestSellingProducts,
    dailySessions,
  };
}

export async function getRevenueReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    summary: {
      todayRevenue: overview.todayRevenue,
      weeklyRevenue: overview.weeklyRevenue,
      monthlyRevenue: overview.monthlyRevenue,
      yearlyRevenue: overview.yearlyRevenue,
    },
    trend: overview.revenueTrend,
  };
}

export async function getSessionReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    totalSessions: overview.totalSessions,
    averageSessionDuration: overview.averageSessionDuration,
    mostUsedPc: overview.mostUsedPc,
    leastUsedPc: overview.leastUsedPc,
    peakUsageHours: overview.peakUsageHours,
    sessionHistory: overview.sessionHistory,
    dailySessions: overview.dailySessions,
    pcUsage: overview.pcUsage,
  };
}

export async function getCustomerReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    newCustomers: overview.newCustomers,
    returningCustomers: overview.returningCustomers,
    vipCustomers: overview.vipCustomers,
    topSpendingCustomers: overview.topSpendingCustomers,
    customerVisitFrequency: overview.customerVisitFrequency,
    customerGrowth: overview.customerGrowth,
  };
}

export async function getInventoryReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    currentStock: overview.currentStock,
    lowStockItems: overview.lowStockItems,
    outOfStockItems: overview.outOfStockItems,
    bestSellingProducts: overview.bestSellingProducts,
    slowMovingProducts: overview.slowMovingProducts,
    inventoryTransactions: overview.inventoryTransactions,
    inventoryValue: overview.inventoryValue,
  };
}

export async function getPrintingReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    totalPrintJobs: overview.totalPrintJobs,
    colorPrints: overview.colorPrints,
    blackWhitePrints: overview.blackWhitePrints,
    printingRevenue: overview.printingRevenueReport,
    mostRequestedServices: overview.mostRequestedServices,
    printJobs: (await getReportsOverview(filters)).sessionHistory,
  };
}

export async function getStaffReport(filters?: ReportFilters) {
  const overview = await getReportsOverview(filters);
  return {
    salesByStaff: overview.salesByStaff,
    sessionsManaged: overview.sessionsManaged,
    printingJobsHandled: overview.printingJobsHandled,
    performanceSummary: overview.performanceSummary,
  };
}
