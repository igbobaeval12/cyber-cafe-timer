import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  inventoryTransactions,
  productCategories,
  products,
  saleItems,
  sales,
  suppliers,
  transactions,
} from '../../drizzle/schema';

export type ProductStatus = 'available' | 'low_stock' | 'out_of_stock';
export type InventoryTransactionType = 'stock_in' | 'stock_out' | 'sale' | 'adjustment';

function normalizeProductStatus(quantityInStock: number, minimumStockLevel: number): ProductStatus {
  if (quantityInStock <= 0) return 'out_of_stock';
  if (minimumStockLevel > 0 && quantityInStock <= minimumStockLevel) return 'low_stock';
  return 'available';
}

function toCurrency(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Number(numericValue.toFixed(2));
}

export async function getProductCategories() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(productCategories).orderBy(desc(productCategories.createdAt));
}

export async function getSuppliers() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
}

export async function getProducts(input?: { search?: string; lowStockOnly?: boolean }) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allProducts = await db.select().from(products).orderBy(desc(products.lastUpdated));
  const query = (input?.search ?? '').trim().toLowerCase();

  return allProducts.filter((product) => {
    const matchesSearch = !query || [product.name, product.productCode ?? '', product.category ?? '', product.barcode ?? '']
      .some((value) => value.toLowerCase().includes(query));
    const matchesLowStock = !input?.lowStockOnly || product.status === 'low_stock' || product.status === 'out_of_stock';
    return matchesSearch && matchesLowStock;
  });
}

export async function createProduct(input: {
  productCode?: string;
  name: string;
  category: string;
  barcode?: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  minimumStockLevel: number;
  supplierId?: number;
}) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), ...input, status: normalizeProductStatus(input.quantityInStock, input.minimumStockLevel) };
  }

  const nextStatus = normalizeProductStatus(input.quantityInStock, input.minimumStockLevel);
  const result = await db.insert(products).values({
    productCode: input.productCode ?? `P-${Date.now()}`,
    name: input.name,
    category: input.category,
    barcode: input.barcode ?? null,
    description: input.description ?? null,
    costPrice: String(toCurrency(input.costPrice)),
    sellingPrice: String(toCurrency(input.sellingPrice)),
    quantityInStock: Math.max(0, input.quantityInStock),
    minimumStockLevel: Math.max(0, input.minimumStockLevel),
    supplierId: input.supplierId ?? null,
    status: nextStatus,
  });

  return { id: Number((result as { insertId?: number }).insertId ?? Date.now()), success: true };
}

export async function updateProduct(productId: number, updates: Partial<{
  productCode: string;
  name: string;
  category: string;
  barcode: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  minimumStockLevel: number;
  supplierId: number;
}>) {
  const db = await getDb();
  if (!db) {
    return { success: true, id: productId, ...updates };
  }

  const existing = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const current = existing[0];
  if (!current) {
    throw new Error('Product not found');
  }

  const nextQuantity = updates.quantityInStock ?? Number(current.quantityInStock ?? 0);
  const nextMinimum = updates.minimumStockLevel ?? Number(current.minimumStockLevel ?? 0);
  const payload: Record<string, unknown> = {
    ...updates,
    status: normalizeProductStatus(nextQuantity, nextMinimum),
    updatedAt: new Date(),
  };

  if (updates.costPrice !== undefined) payload.costPrice = String(toCurrency(updates.costPrice));
  if (updates.sellingPrice !== undefined) payload.sellingPrice = String(toCurrency(updates.sellingPrice));
  if (updates.quantityInStock !== undefined) payload.quantityInStock = Math.max(0, updates.quantityInStock);
  if (updates.minimumStockLevel !== undefined) payload.minimumStockLevel = Math.max(0, updates.minimumStockLevel);
  if (updates.supplierId !== undefined) payload.supplierId = updates.supplierId ?? null;

  await db.update(products).set(payload).where(eq(products.id, productId));
  return { success: true };
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) {
    return { success: true };
  }

  await db.delete(inventoryTransactions).where(eq(inventoryTransactions.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  return { success: true };
}

export async function stockInProduct(productId: number, input: { quantity: number; unitCost?: number; notes?: string }) {
  const db = await getDb();
  if (!db) {
    return { success: true };
  }

  const existing = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const current = existing[0];
  if (!current) {
    throw new Error('Product not found');
  }

  const quantity = Math.max(0, Number(input.quantity ?? 0));
  const updatedQuantity = Number(current.quantityInStock ?? 0) + quantity;
  const nextStatus = normalizeProductStatus(updatedQuantity, Number(current.minimumStockLevel ?? 0));

  await db.update(products).set({
    quantityInStock: updatedQuantity,
    status: nextStatus,
    lastUpdated: new Date(),
  }).where(eq(products.id, productId));

  await db.insert(inventoryTransactions).values({
    productId,
    transactionType: 'stock_in',
    quantity,
    unitCost: String(toCurrency(input.unitCost ?? current.costPrice ?? 0)),
    notes: input.notes ?? 'Stock in',
  });

  return { success: true, updatedQuantity };
}

export async function stockOutProduct(productId: number, input: { quantity: number; notes?: string }) {
  const db = await getDb();
  if (!db) {
    return { success: true };
  }

  const existing = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const current = existing[0];
  if (!current) {
    throw new Error('Product not found');
  }

  const requestedQuantity = Math.max(0, Number(input.quantity ?? 0));
  const currentQuantity = Number(current.quantityInStock ?? 0);
  if (requestedQuantity > currentQuantity) {
    throw new Error('Insufficient stock available');
  }

  const updatedQuantity = currentQuantity - requestedQuantity;
  const nextStatus = normalizeProductStatus(updatedQuantity, Number(current.minimumStockLevel ?? 0));

  await db.update(products).set({
    quantityInStock: updatedQuantity,
    status: nextStatus,
    lastUpdated: new Date(),
  }).where(eq(products.id, productId));

  await db.insert(inventoryTransactions).values({
    productId,
    transactionType: 'stock_out',
    quantity: requestedQuantity,
    unitCost: String(toCurrency(current.costPrice ?? 0)),
    notes: input.notes ?? 'Stock out',
  });

  return { success: true, updatedQuantity };
}

export async function getInventoryDashboardStats() {
  const db = await getDb();
  if (!db) {
    return { totalProducts: 0, lowStock: 0, outOfStock: 0, todaySales: 0, inventoryValue: 0 };
  }

  const allProducts = await db.select().from(products);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySalesRecords = await db.select().from(sales)
    .where(and(
      gt(sales.createdAt, today),
      sql`${sales.createdAt} < ${tomorrow}`,
    ));

  const totalProducts = allProducts.length;
  const lowStock = allProducts.filter((product) => product.status === 'low_stock').length;
  const outOfStock = allProducts.filter((product) => product.status === 'out_of_stock').length;
  const inventoryValue = allProducts.reduce((sum, product) => sum + Number(product.costPrice ?? 0) * Number(product.quantityInStock ?? 0), 0);
  const todaySales = todaySalesRecords.reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0), 0);

  return {
    totalProducts,
    lowStock,
    outOfStock,
    todaySales,
    inventoryValue,
  };
}

export async function createSale(input: {
  customerId?: number;
  sessionId?: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'pos' | 'mobile';
  discountAmount?: number;
  notes?: string;
  items: Array<{ productId: number; quantity: number; }>
}) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), success: true };
  }

  const itemDetails = await Promise.all(input.items.map(async (item) => {
    const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    const currentProduct = product[0];
    if (!currentProduct) {
      throw new Error(`Product ${item.productId} not found`);
    }

    if (Number(currentProduct.quantityInStock ?? 0) < item.quantity) {
      throw new Error(`Insufficient stock for ${currentProduct.name}`);
    }

    const unitPrice = Number(currentProduct.sellingPrice ?? 0);
    const quantity = Math.max(1, Math.floor(item.quantity));
    const totalAmount = Number((unitPrice * quantity).toFixed(2));

    return {
      productId: item.productId,
      quantity,
      unitPrice,
      totalAmount,
      productName: currentProduct.name,
      currentQuantity: Number(currentProduct.quantityInStock ?? 0),
    };
  }));

  const subtotal = itemDetails.reduce((sum, item) => sum + item.totalAmount, 0);
  const discountAmount = Math.max(0, toCurrency(input.discountAmount ?? 0));
  const totalAmount = Number((subtotal - discountAmount).toFixed(2));
  const saleNumber = `POS-${Date.now()}`;

  const saleId = await db.transaction(async (tx) => {
    await tx.insert(sales).values({
      customerId: input.customerId ?? null,
      sessionId: input.sessionId ?? null,
      saleNumber,
      subtotal: String(subtotal),
      discountAmount: String(discountAmount),
      totalAmount: String(totalAmount),
      paymentMethod: input.paymentMethod,
      status: 'completed',
      notes: input.notes ?? null,
    });

    const insertedSale = await tx.select({ id: sales.id }).from(sales).where(eq(sales.saleNumber, saleNumber)).limit(1);
    const insertedSaleId = insertedSale[0]?.id;
    if (!insertedSaleId) throw new Error('Sale could not be created');

    for (const item of itemDetails) {
      await tx.insert(saleItems).values({
        saleId: insertedSaleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        totalAmount: String(item.totalAmount),
      });

      await tx.update(products).set({
        quantityInStock: item.currentQuantity - item.quantity,
        status: normalizeProductStatus(item.currentQuantity - item.quantity, Number((await tx.select().from(products).where(eq(products.id, item.productId)).limit(1))[0]?.minimumStockLevel ?? 0)),
        lastUpdated: new Date(),
      }).where(eq(products.id, item.productId));

      await tx.insert(inventoryTransactions).values({
        productId: item.productId,
        transactionType: 'sale',
        quantity: item.quantity,
        unitCost: String(item.unitPrice),
        notes: `POS sale ${saleNumber}`,
      });
    }

    const transactionPaymentMethod: 'cash' | 'other' = input.paymentMethod === 'cash' ? 'cash' : 'other';
    if (input.sessionId) {
      await tx.insert(transactions).values({
        sessionId: input.sessionId,
        userId: input.customerId ?? null,
        transactionType: 'sale_charge',
        amount: String(totalAmount),
        paymentMethod: transactionPaymentMethod,
        status: 'completed',
        receiptNumber: saleNumber,
        notes: input.notes ?? `Sale ${saleNumber}`,
      });
    }

    return insertedSaleId;
  });

  return { success: true, saleId, saleNumber, totalAmount };
}

export async function getSalesHistory(limit = 20) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
  const saleItemsData = await db.select().from(saleItems);

  return allSales.map((sale) => ({
    ...sale,
    items: saleItemsData.filter((item) => item.saleId === sale.id),
  }));
}
