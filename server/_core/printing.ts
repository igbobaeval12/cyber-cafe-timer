import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { bills, computers, printJobs, printQueues, printServices, sessions, transactions, users } from '../../drizzle/schema';

export type PrintingServiceName =
  | 'Black & White Printing'
  | 'Color Printing'
  | 'Photocopy'
  | 'Scanning'
  | 'Lamination'
  | 'Typing Service'
  | 'Passport Photograph Service';

export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'cancelled';
export type PaperSize = 'A4' | 'A3' | 'Letter' | 'Legal';
export type PrintType = 'single_sided' | 'double_sided';
export type ColorOption = 'black_white' | 'color';

export const printingServiceCatalog: Array<{ name: PrintingServiceName; unitPrice: number; colorOption: ColorOption; }> = [
  { name: 'Black & White Printing', unitPrice: 1.5, colorOption: 'black_white' },
  { name: 'Color Printing', unitPrice: 4, colorOption: 'color' },
  { name: 'Photocopy', unitPrice: 1.2, colorOption: 'black_white' },
  { name: 'Scanning', unitPrice: 2.5, colorOption: 'black_white' },
  { name: 'Lamination', unitPrice: 5, colorOption: 'black_white' },
  { name: 'Typing Service', unitPrice: 3, colorOption: 'black_white' },
  { name: 'Passport Photograph Service', unitPrice: 8, colorOption: 'color' },
];

export async function getPrintServices() {
  const db = await getDb();
  if (!db) {
    return printingServiceCatalog.map((service) => ({
      id: Math.floor(Math.random() * 1000),
      serviceCode: service.name.toLowerCase().replace(/[^a-z]+/g, '_'),
      name: service.name,
      unitPrice: String(service.unitPrice),
      colorOption: service.colorOption,
      isActive: true,
    }));
  }

  const existing = await db.select().from(printServices).where(eq(printServices.isActive, true));
  if (existing.length > 0) {
    return existing;
  }

  return printingServiceCatalog.map((service, index) => ({
    id: index + 1,
    serviceCode: service.name.toLowerCase().replace(/[^a-z]+/g, '_'),
    name: service.name,
    unitPrice: String(service.unitPrice),
    colorOption: service.colorOption,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function calculatePrintJobTotal(pageCount: number, quantity: number, unitPrice: number) {
  const safePageCount = Math.max(0, Number(pageCount ?? 0));
  const safeQuantity = Math.max(1, Number(quantity ?? 1));
  const safeUnitPrice = Math.max(0, Number(unitPrice ?? 0));
  return Number((safePageCount * safeQuantity * safeUnitPrice).toFixed(2));
}

export async function createPrintJob(input: {
  customerId?: number;
  sessionId?: number;
  computerId?: number;
  serviceId?: number;
  serviceName: string;
  jobName: string;
  paperSize: PaperSize;
  printType: PrintType;
  colorOption: ColorOption;
  pageCount: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), ...input, status: 'pending', totalCost: calculatePrintJobTotal(input.pageCount, input.quantity, input.unitPrice) };
  }

  const totalCost = calculatePrintJobTotal(input.pageCount, input.quantity, input.unitPrice);
  const resolvedSession = input.sessionId
    ? (await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1))[0]
    : input.customerId
      ? (await db.select().from(sessions)
        .where(and(eq(sessions.userId, input.customerId), eq(sessions.sessionStatus, 'active')))
        .orderBy(desc(sessions.startTime))
        .limit(1))[0]
      : undefined;

  if (!resolvedSession || !input.computerId && !resolvedSession.computerId) {
    throw new Error('A valid active session or computer is required for a print job');
  }

  const jobRecord = {
    customerId: input.customerId ?? null,
    sessionId: resolvedSession.id,
    computerId: input.computerId ?? resolvedSession.computerId,
    serviceId: input.serviceId ?? null,
    jobName: input.jobName,
    serviceName: input.serviceName,
    paperSize: input.paperSize,
    printType: input.printType,
    colorOption: input.colorOption,
    pageCount: Math.max(0, input.pageCount),
    quantity: Math.max(1, input.quantity),
    unitPrice: String(input.unitPrice),
    totalCost: String(totalCost),
    status: 'pending' as const,
    notes: input.notes ?? null,
  };

  const result = await db.insert(printJobs).values(jobRecord);
  const jobId = Number((result as { insertId?: number }).insertId ?? Date.now());

  const queueCount = await db.select().from(printQueues);
  await db.insert(printQueues).values({
    jobId,
    queueOrder: queueCount.length + 1,
    status: 'waiting',
  });

  if (resolvedSession?.id) {
    const existingBill = await db.select().from(bills).where(eq(bills.sessionId, resolvedSession.id)).limit(1);
    const chargeAmount = totalCost;
    const billRecord = existingBill[0];

    if (billRecord) {
      const newAdditional = Number(billRecord.additionalCharges ?? 0) + chargeAmount;
      await db.update(bills).set({
        additionalCharges: String(newAdditional),
        totalAmount: String(Number(billRecord.totalAmount ?? 0) + chargeAmount),
        updatedAt: new Date(),
        notes: billRecord.notes ? `${billRecord.notes}; Print service charge` : 'Print service charge',
      }).where(eq(bills.id, billRecord.id));
    } else {
      await db.insert(bills).values({
        sessionId: resolvedSession.id,
        userId: input.customerId ?? resolvedSession.userId ?? null,
        computerId: resolvedSession.computerId,
        pricingType: 'custom',
        hourlyRate: '0',
        fixedPackagePrice: '0',
        customPrice: '0',
        durationMinutes: Number(resolvedSession.totalDurationMinutes ?? 0),
        baseCharge: '0',
        additionalCharges: String(chargeAmount),
        discountAmount: '0',
        totalAmount: String(chargeAmount),
        status: 'unpaid',
        paymentMethod: resolvedSession.paymentMode === 'prepaid' ? 'mobile' : 'cash',
        notes: 'Print service charge',
      });
    }

    await db.insert(transactions).values({
      sessionId: resolvedSession.id,
      userId: input.customerId ?? resolvedSession.userId ?? null,
      transactionType: 'print_charge',
      amount: String(chargeAmount),
      paymentMethod: resolvedSession.paymentMode === 'prepaid' ? 'prepaid_balance' : 'cash',
      status: 'completed',
      receiptNumber: `PR-${jobId}-${Date.now()}`,
      notes: `${input.serviceName} - ${input.pageCount} pages`,
    });
  } else if (input.customerId) {
    await db.insert(bills).values({
      sessionId: 0,
      userId: input.customerId,
      computerId: input.computerId ?? 0,
      pricingType: 'custom',
      hourlyRate: '0',
      fixedPackagePrice: '0',
      customPrice: '0',
      durationMinutes: 0,
      baseCharge: '0',
      additionalCharges: String(totalCost),
      discountAmount: '0',
      totalAmount: String(totalCost),
      status: 'unpaid',
      paymentMethod: 'cash',
      notes: `Standalone print charge: ${input.serviceName}`,
    });

    await db.insert(transactions).values({
      sessionId: 0,
      userId: input.customerId,
      transactionType: 'print_charge',
      amount: String(totalCost),
      paymentMethod: 'cash',
      status: 'completed',
      receiptNumber: `PR-${jobId}-${Date.now()}`,
      notes: `${input.serviceName} - ${input.pageCount} pages`,
    });
  }

  return { id: jobId, ...jobRecord, status: 'pending' as const };
}

export async function getPrintJobs(input?: { status?: PrintJobStatus; search?: string }) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allJobs = await db.select().from(printJobs).orderBy(desc(printJobs.createdAt));
  const filtered = allJobs.filter((job) => {
    const matchesStatus = !input?.status || job.status === input.status;
    const query = (input?.search ?? '').trim().toLowerCase();
    const matchesSearch = !query || [job.jobName, job.serviceName, String(job.customerId ?? ''), String(job.computerId ?? '')].some((value) => value?.toString().toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return filtered;
}

export async function getPrintHistory(limit = 50) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allJobs = await db.select().from(printJobs).orderBy(desc(printJobs.createdAt)).limit(limit);
  return allJobs.filter((job) => job.status === 'completed' || job.status === 'cancelled');
}

export async function updatePrintJob(jobId: number, updates: Partial<{
  customerId: number;
  computerId: number;
  serviceId: number;
  jobName: string;
  serviceName: string;
  paperSize: PaperSize;
  printType: PrintType;
  colorOption: ColorOption;
  pageCount: number;
  quantity: number;
  unitPrice: number;
  status: PrintJobStatus;
  notes: string;
}>) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const existing = await db.select().from(printJobs).where(eq(printJobs.id, jobId)).limit(1);
  const current = existing[0];
  if (!current) {
    throw new Error('Print job not found');
  }

  const nextPageCount = updates.pageCount ?? Number(current.pageCount ?? 0);
  const nextQuantity = updates.quantity ?? Number(current.quantity ?? 1);
  const nextUnitPrice = updates.unitPrice ?? Number(current.unitPrice ?? 0);
  const recalculatedTotal = calculatePrintJobTotal(nextPageCount, nextQuantity, nextUnitPrice);

  const payload: Record<string, unknown> = {
    ...updates,
    unitPrice: String(nextUnitPrice),
    totalCost: String(recalculatedTotal),
    updatedAt: new Date(),
  };

  if (updates.unitPrice !== undefined) {
    payload.unitPrice = String(updates.unitPrice);
  }

  if (updates.status === 'cancelled') {
    await db.update(printQueues).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(printQueues.jobId, jobId));
  }

  await db.update(printJobs).set(payload).where(eq(printJobs.id, jobId));
  return { success: true };
}

export async function completePrintJob(jobId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  await db.update(printJobs).set({ status: 'completed', updatedAt: new Date() }).where(eq(printJobs.id, jobId));
  await db.update(printQueues).set({ status: 'completed', updatedAt: new Date() }).where(eq(printQueues.jobId, jobId));

  return { success: true };
}

export async function deletePrintJob(jobId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  await db.delete(printQueues).where(eq(printQueues.jobId, jobId));
  await db.delete(printJobs).where(eq(printJobs.id, jobId));
  return { success: true };
}

export async function getPrintDashboardStats() {
  const db = await getDb();
  if (!db) {
    return {
      pendingJobs: 0,
      completedToday: 0,
      printingRevenueToday: 0,
      activeQueue: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allJobs = await db.select().from(printJobs);
  const pendingJobs = allJobs.filter((job) => job.status === 'pending' || job.status === 'printing').length;
  const completedToday = allJobs.filter((job) => job.status === 'completed' && job.createdAt && job.createdAt >= today && job.createdAt < tomorrow).length;
  const printingRevenueToday = allJobs
    .filter((job) => job.status === 'completed' && job.createdAt && job.createdAt >= today && job.createdAt < tomorrow)
    .reduce((sum, job) => sum + Number(job.totalCost ?? 0), 0);
  const activeQueue = (await db.select().from(printQueues)).filter((queue) => queue.status === 'waiting' || queue.status === 'processing').length;

  return {
    pendingJobs,
    completedToday,
    printingRevenueToday: Number(printingRevenueToday.toFixed(2)),
    activeQueue,
  };
}
