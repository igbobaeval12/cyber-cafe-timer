import { eq } from 'drizzle-orm';
import { getDb, getSystemSettings } from '../db';
import { bills, computers, payments, pricingConfigs, receipts, sessions, users } from '../../drizzle/schema';

export type BillingPricingType = 'hourly' | 'fixed' | 'custom';

export interface AdditionalChargeInput {
  name: string;
  amount: number;
  quantity?: number;
}

export interface BillingCalculationInput {
  pricingType: BillingPricingType;
  hourlyRate?: number;
  fixedPackagePrice?: number;
  customPrice?: number;
  durationMinutes: number;
  additionalCharges?: AdditionalChargeInput[];
  discountAmount?: number;
}

export interface BillingCalculationResult {
  baseCharge: number;
  additionalCharges: number;
  discountAmount: number;
  totalAmount: number;
  pricingType: BillingPricingType;
}

export interface CreateBillInput {
  sessionId: number;
  userId?: number;
  pricingType?: BillingPricingType;
  hourlyRate?: number;
  fixedPackagePrice?: number;
  customPrice?: number;
  durationMinutes?: number;
  additionalCharges?: AdditionalChargeInput[];
  discountAmount?: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'pos' | 'mobile';
  notes?: string;
  status?: 'paid' | 'unpaid';
}

export function calculateBill(input: BillingCalculationInput): BillingCalculationResult {
  const durationHours = input.durationMinutes / 60;
  const baseCharge = input.pricingType === 'hourly'
    ? (input.hourlyRate ?? 0) * durationHours
    : input.pricingType === 'fixed'
      ? (input.fixedPackagePrice ?? 0)
      : (input.customPrice ?? 0);

  const additionalCharges = (input.additionalCharges ?? []).reduce((sum, item) => {
    const quantity = item.quantity ?? 1;
    return sum + Number(item.amount) * quantity;
  }, 0);

  const discountAmount = Math.max(0, input.discountAmount ?? 0);
  const totalAmount = Math.max(0, baseCharge + additionalCharges - discountAmount);

  return {
    baseCharge: Number(baseCharge.toFixed(2)),
    additionalCharges: Number(additionalCharges.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    pricingType: input.pricingType,
  };
}

export async function createBill(input: CreateBillInput) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const existingSession = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
  const session = existingSession[0];
  if (!session) {
    throw new Error('Session not found');
  }

  const pricingConfig = session.pricingConfigId
    ? (await db.select().from(pricingConfigs).where(eq(pricingConfigs.id, session.pricingConfigId)).limit(1))[0]
    : undefined;

  const durationMinutes = input.durationMinutes ?? Number(session.totalDurationMinutes || 0);
  const pricingType = input.pricingType ?? 'hourly';
  const hourlyRate = input.hourlyRate ?? Number(pricingConfig?.hourlyRate || 0);
  const fixedPackagePrice = input.fixedPackagePrice ?? Number(pricingConfig?.minimumCharge || 0);
  const customPrice = input.customPrice ?? Number(pricingConfig?.minimumCharge || 0);

  const calculation = calculateBill({
    pricingType,
    hourlyRate,
    fixedPackagePrice,
    customPrice,
    durationMinutes,
    additionalCharges: input.additionalCharges,
    discountAmount: input.discountAmount,
  });

  const existingBill = await db.select().from(bills).where(eq(bills.sessionId, input.sessionId)).limit(1);
  if (existingBill[0]) {
    return existingBill[0];
  }

  const values = {
    sessionId: input.sessionId,
    userId: input.userId ?? session.userId ?? null,
    computerId: session.computerId,
    pricingType,
    hourlyRate: String(hourlyRate),
    fixedPackagePrice: String(fixedPackagePrice),
    customPrice: String(customPrice),
    durationMinutes,
    baseCharge: String(calculation.baseCharge),
    additionalCharges: String(calculation.additionalCharges),
    discountAmount: String(calculation.discountAmount),
    totalAmount: String(calculation.totalAmount),
    status: input.status ?? 'unpaid',
    paymentMethod: input.paymentMethod ?? 'cash',
    notes: input.notes ?? null,
  };

  const result = await db.insert(bills).values(values);
  const billId = Number((result as { insertId?: number }).insertId ?? Date.now());
  return { id: billId, ...values };
}

export async function updateBill(billId: number, updates: Partial<{
  pricingType: BillingPricingType;
  status: 'paid' | 'unpaid';
  paymentMethod: 'cash' | 'bank_transfer' | 'pos' | 'mobile';
  additionalCharges: number;
  discountAmount: number;
  notes: string | null;
}>) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const existingBill = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  const currentBill = existingBill[0];
  if (!currentBill) {
    throw new Error('Bill not found');
  }

  const pricingType = updates.pricingType ?? currentBill.pricingType;
  const additionalCharges = updates.additionalCharges ?? Number(currentBill.additionalCharges ?? 0);
  const discountAmount = updates.discountAmount ?? Number(currentBill.discountAmount ?? 0);
  const recalculated = calculateBill({
    pricingType,
    hourlyRate: Number(currentBill.hourlyRate ?? 0),
    fixedPackagePrice: Number(currentBill.fixedPackagePrice ?? 0),
    customPrice: Number(currentBill.customPrice ?? 0),
    durationMinutes: Number(currentBill.durationMinutes ?? 0),
    additionalCharges: [{ name: 'Adjustment', amount: additionalCharges }],
    discountAmount,
  });

  await db.update(bills).set({
    ...updates,
    baseCharge: String(recalculated.baseCharge),
    additionalCharges: String(recalculated.additionalCharges),
    discountAmount: String(recalculated.discountAmount),
    totalAmount: String(recalculated.totalAmount),
    updatedAt: new Date(),
  }).where(eq(bills.id, billId));

  return { success: true };
}

export async function recordPayment(input: {
  billId: number;
  sessionId: number;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'pos' | 'mobile';
  referenceNumber?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const bill = await db.select().from(bills).where(eq(bills.id, input.billId)).limit(1);
  const billRecord = bill[0];
  if (!billRecord) {
    throw new Error('Bill not found');
  }
  if (billRecord.sessionId !== input.sessionId) {
    throw new Error('Payment session does not match the bill');
  }

  const paymentAmount = Math.max(0, Number(input.amount ?? 0));
  const totalAmount = Number(billRecord.totalAmount ?? 0);

  await db.insert(payments).values({
    billId: input.billId,
    sessionId: input.sessionId,
    amount: String(paymentAmount),
    paymentMethod: input.paymentMethod,
    status: 'completed',
    referenceNumber: input.referenceNumber ?? null,
    notes: input.notes ?? null,
  });

  await db.update(bills).set({
    status: paymentAmount >= totalAmount ? 'paid' : 'unpaid',
    paymentMethod: input.paymentMethod,
    updatedAt: new Date(),
  }).where(eq(bills.id, input.billId));

  return { success: true, status: paymentAmount >= totalAmount ? 'paid' : 'unpaid' };
}

export async function generateReceipt(input: {
  billId: number;
  sessionId: number;
  customerName?: string;
  staffName?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'pos' | 'mobile';
  servicesUsed?: string;
  itemizedCharges?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const bill = await db.select().from(bills).where(eq(bills.id, input.billId)).limit(1);
  const billRecord = bill[0];
  if (!billRecord) {
    throw new Error('Bill not found');
  }

  const session = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
  const sessionRecord = session[0];
  if (!sessionRecord) {
    throw new Error('Session not found');
  }

  const computer = await db.select().from(computers).where(eq(computers.id, billRecord.computerId)).limit(1);
  const customer = input.customerName ?? (billRecord.userId ? (await db.select().from(users).where(eq(users.id, billRecord.userId)).limit(1))[0]?.name ?? 'Guest' : 'Guest');
  const receiptNumber = `RCP-${billRecord.id}-${Date.now()}`;
  const settings = await getSystemSettings();
  const currencySymbol = '₦';

  const itemizedCharges = input.itemizedCharges ?? [
    `Base Charge: ${currencySymbol}${Number(billRecord.baseCharge ?? 0).toFixed(2)}`,
    `Additional Charges: ${currencySymbol}${Number(billRecord.additionalCharges ?? 0).toFixed(2)}`,
    `Discount: -${currencySymbol}${Number(billRecord.discountAmount ?? 0).toFixed(2)}`,
  ].join('\n');

  const payload = {
    billId: billRecord.id,
    sessionId: input.sessionId,
    receiptNumber,
    userId: billRecord.userId ?? null,
    computerId: billRecord.computerId,
    customerName: customer ?? 'Guest',
    startTime: sessionRecord.startTime,
    endTime: sessionRecord.endTime ?? new Date(),
    durationMinutes: billRecord.durationMinutes ?? 0,
    servicesUsed: input.servicesUsed ?? `PC Session on ${computer[0]?.pcName ?? `PC #${billRecord.computerId}`}`,
    itemizedCharges,
    discountAmount: billRecord.discountAmount,
    totalAmount: billRecord.totalAmount,
    paymentMethod: input.paymentMethod ?? billRecord.paymentMethod,
    staffName: input.staffName ?? 'Admin',
    notes: input.notes ?? null,
  };

  const result = await db.insert(receipts).values(payload);
  const receiptId = Number((result as { insertId?: number }).insertId ?? Date.now());
  return { id: receiptId, ...payload };
}

export async function getBillById(billId: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  return result[0];
}

export async function getAllBills() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db.select().from(bills).orderBy(bills.createdAt);
}

export async function getReceiptHistory(limit = 20) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db.select().from(receipts).orderBy(receipts.createdAt).limit(limit);
}

export async function getBillingSummary() {
  const db = await getDb();
  if (!db) {
    return { todayRevenue: 0, totalRevenue: 0, pendingPayments: 0, recentTransactions: 0 };
  }

  const allBills = await db.select().from(bills);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRevenue = allBills.reduce((sum, bill) => {
    const createdAt = bill.createdAt ? new Date(bill.createdAt) : null;
    return sum + (createdAt && createdAt >= today && bill.status === 'paid' ? Number(bill.totalAmount) : 0);
  }, 0);

  const pendingPayments = allBills.filter((bill) => bill.status === 'unpaid').length;
  const totalRevenue = allBills.reduce((sum, bill) => sum + (bill.status === 'paid' ? Number(bill.totalAmount) : 0), 0);
  const recentTransactions = allBills.filter((bill) => bill.status === 'paid').length;

  return { todayRevenue, totalRevenue, pendingPayments, recentTransactions };
}
