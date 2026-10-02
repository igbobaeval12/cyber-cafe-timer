import { decimal, int, mysqlEnum, mysqlTable, text, varchar, boolean, json, uniqueIndex, index, foreignKey, customType } from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

const mariadbTimestamp = customType<{ data: Date; driverData: string | null }>({ dataType: () => "datetime" });

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  membershipTier: mysqlEnum("membershipTier", ["walk_in", "regular", "vip", "student", "corporate", "none", "basic", "premium"]).default("walk_in").notNull(),
  customerStatus: mysqlEnum("customerStatus", ["active", "inactive", "blacklisted"]).default("active").notNull(),
  prepaidBalance: decimal("prepaidBalance", { precision: 10, scale: 2 }).default("0").notNull(),
  loyaltyPoints: int("loyaltyPoints").default(0).notNull(),
  customerNotes: text("customerNotes"),
  registeredAt: mariadbTimestamp("registeredAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastSignedIn: mariadbTimestamp("lastSignedIn").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type User = Omit<typeof users.$inferSelect, "role"> & {
  role: "user" | "admin" | "super_admin";
};
export type InsertUser = typeof users.$inferInsert;

export const staffRoles = mysqlTable("staffRoles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  description: text("description"),
  permissions: json("permissions"),
  isSystem: boolean("isSystem").default(false).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type StaffRole = typeof staffRoles.$inferSelect;
export type InsertStaffRole = typeof staffRoles.$inferInsert;

export const staffPermissions = mysqlTable("staffPermissions", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  label: varchar("label", { length: 160 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 80 }),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type StaffPermission = typeof staffPermissions.$inferSelect;
export type InsertStaffPermission = typeof staffPermissions.$inferInsert;

export const staffRolePermissions = mysqlTable("staffRolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  permissionId: int("permissionId").notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  roleIdx: index("staff_role_permissions_role_idx").on(table.roleId),
  permissionIdx: index("staff_role_permissions_permission_idx").on(table.permissionId),
  rolePermissionUnique: uniqueIndex("staff_role_permissions_unique_idx").on(table.roleId, table.permissionId),
}));

export type StaffRolePermission = typeof staffRolePermissions.$inferSelect;
export type InsertStaffRolePermission = typeof staffRolePermissions.$inferInsert;

export const staffs = mysqlTable("staffs", {
  id: int("id").autoincrement().primaryKey(),
  staffId: varchar("staffId", { length: 40 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  phoneNumber: varchar("phoneNumber", { length: 30 }),
  passwordHash: text("passwordHash").notNull(),
  roleId: int("roleId").notNull().references(() => staffRoles.id, { onDelete: "restrict", onUpdate: "cascade" }),
  profilePhoto: varchar("profilePhoto", { length: 500 }),
  employmentDate: mariadbTimestamp("employmentDate").default(sql`CURRENT_TIMESTAMP`).notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["active", "suspended", "inactive"]).default("active").notNull(),
  lastLogin: mariadbTimestamp("lastLogin"),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  roleIdx: index("staffs_role_idx").on(table.roleId),
  statusIdx: index("staffs_status_idx").on(table.status),
}));

export type Staff = typeof staffs.$inferSelect;
export type InsertStaff = typeof staffs.$inferInsert;

export const staffLoginHistory = mysqlTable("staffLoginHistory", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull().references(() => staffs.id, { onDelete: "cascade", onUpdate: "cascade" }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  loginAt: mariadbTimestamp("loginAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  success: boolean("success").default(true).notNull(),
  details: text("details"),
}, (table) => ({
  staffIdx: index("staff_login_history_staff_idx").on(table.staffId),
  successIdx: index("staff_login_history_success_idx").on(table.success),
  loginAtIdx: index("staff_login_history_login_at_idx").on(table.loginAt),
}));

export type StaffLoginHistory = typeof staffLoginHistory.$inferSelect;
export type InsertStaffLoginHistory = typeof staffLoginHistory.$inferInsert;

export const staffActivityLogs = mysqlTable("staffActivityLogs", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").references(() => staffs.id, { onDelete: "set null", onUpdate: "cascade" }),
  action: varchar("action", { length: 120 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  staffIdx: index("staff_activity_logs_staff_idx").on(table.staffId),
  actionIdx: index("staff_activity_logs_action_idx").on(table.action),
  createdAtIdx: index("staff_activity_logs_created_at_idx").on(table.createdAt),
}));

export type StaffActivityLog = typeof staffActivityLogs.$inferSelect;
export type InsertStaffActivityLog = typeof staffActivityLogs.$inferInsert;

/**
 * PC/Computer table for tracking all machines in the café
 */
export const computers = mysqlTable("computers", {
  id: int("id").autoincrement().primaryKey(),
  pcNumber: int("pcNumber"),
  pcName: varchar("pcName", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("offline").notNull(),
  currentCustomer: varchar("currentCustomer", { length: 100 }),
  remainingTime: varchar("remainingTime", { length: 50 }),
  currentSession: varchar("currentSession", { length: 100 }),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }).default("0").notNull(),
  lastActivity: mariadbTimestamp("lastActivity"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  macAddress: varchar("macAddress", { length: 17 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastHeartbeat: mariadbTimestamp("lastHeartbeat"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Computer = typeof computers.$inferSelect;
export type InsertComputer = typeof computers.$inferInsert;

/**
 * Pricing configuration table
 */
export const pricingConfigs = mysqlTable("pricingConfigs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }).notNull(),
  minimumCharge: decimal("minimumCharge", { precision: 10, scale: 2 }).default("0").notNull(),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }).default("0").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PricingConfig = typeof pricingConfigs.$inferSelect;
export type InsertPricingConfig = typeof pricingConfigs.$inferInsert;

/**
 * Session table for tracking PC rental sessions
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  computerId: int("computerId").notNull().references(() => computers.id, { onDelete: "restrict", onUpdate: "cascade" }),
  userId: int("userId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  pricingConfigId: int("pricingConfigId").notNull().references(() => pricingConfigs.id, { onDelete: "restrict", onUpdate: "cascade" }),
  sessionStatus: mysqlEnum("sessionStatus", ["active", "paused", "completed", "expired"]).default("active").notNull(),
  paymentMode: mysqlEnum("paymentMode", ["prepaid", "postpaid"]).default("postpaid").notNull(),
  startTime: mariadbTimestamp("startTime").default(sql`CURRENT_TIMESTAMP`).notNull(),
  endTime: mariadbTimestamp("endTime"),
  pausedTime: mariadbTimestamp("pausedTime"),
  totalDurationMinutes: int("totalDurationMinutes").default(0).notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).unique(), // Security token for session validation
  tokenExpiresAt: mariadbTimestamp("tokenExpiresAt"), // When the token expires
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  activeSessionPerComputer: index("active_session_per_computer_idx").on(table.computerId, table.sessionStatus),
  computerIdx: index("sessions_computer_idx").on(table.computerId),
  userIdx: index("sessions_user_idx").on(table.userId),
  pricingConfigIdx: index("sessions_pricing_config_idx").on(table.pricingConfigId),
  statusIdx: index("sessions_status_idx").on(table.sessionStatus),
  startTimeIdx: index("sessions_start_time_idx").on(table.startTime),
}));

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Billing records for completed or pending sessions.
 */
export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  userId: int("userId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  computerId: int("computerId").notNull().references(() => computers.id, { onDelete: "restrict", onUpdate: "cascade" }),
  pricingType: mysqlEnum("pricingType", ["hourly", "fixed", "custom"]).default("hourly").notNull(),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }).default("0").notNull(),
  fixedPackagePrice: decimal("fixedPackagePrice", { precision: 10, scale: 2 }).default("0").notNull(),
  customPrice: decimal("customPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  durationMinutes: int("durationMinutes").default(0).notNull(),
  baseCharge: decimal("baseCharge", { precision: 10, scale: 2 }).default("0").notNull(),
  additionalCharges: decimal("additionalCharges", { precision: 10, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["paid", "unpaid"]).default("unpaid").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "pos", "mobile"]).default("cash").notNull(),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("bills_session_idx").on(table.sessionId),
  userIdx: index("bills_user_idx").on(table.userId),
  statusIdx: index("bills_status_idx").on(table.status),
}));

export type Bill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;

/**
 * Payment records linked to a bill.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("billId").notNull().references(() => bills.id, { onDelete: "cascade", onUpdate: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "pos", "mobile"]).default("cash").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("completed").notNull(),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  billIdx: index("payments_bill_idx").on(table.billId),
  sessionIdx: index("payments_session_idx").on(table.sessionId),
  statusIdx: index("payments_status_idx").on(table.status),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Receipt table for session receipts
 */
export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("billId").references(() => bills.id, { onDelete: "set null", onUpdate: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  receiptNumber: varchar("receiptNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  computerId: int("computerId").notNull().references(() => computers.id, { onDelete: "restrict", onUpdate: "cascade" }),
  customerName: varchar("customerName", { length: 255 }),
  startTime: mariadbTimestamp("startTime").default(sql`CURRENT_TIMESTAMP`).notNull(),
  endTime: mariadbTimestamp("endTime").notNull().default(sql`CURRENT_TIMESTAMP`),
  durationMinutes: int("durationMinutes").notNull(),
  servicesUsed: text("servicesUsed"),
  itemizedCharges: text("itemizedCharges"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "pos", "mobile"]).notNull(),
  staffName: varchar("staffName", { length: 255 }),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("receipts_session_idx").on(table.sessionId),
  billIdx: index("receipts_bill_idx").on(table.billId),
  userIdx: index("receipts_user_idx").on(table.userId),
}));

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

/**
 * Transaction table for payment tracking
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId"),
  transactionType: mysqlEnum("transactionType", ["session_charge", "prepaid_deposit", "refund", "print_charge", "sale_charge"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "prepaid_balance", "other"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 50 }),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("transactions_session_idx").on(table.sessionId),
  userIdx: index("transactions_user_idx").on(table.userId),
  statusIdx: index("transactions_status_idx").on(table.status),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Product categories for inventory and POS.
 */
export const productCategories = mysqlTable("productCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

/**
 * Suppliers for inventory products.
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Inventory products available for sale.
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 120 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 120 }).default("general").notNull(),
  barcode: varchar("barcode", { length: 120 }),
  description: text("description"),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  sellingPrice: decimal("sellingPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  quantityInStock: int("quantityInStock").default(0).notNull(),
  minimumStockLevel: int("minimumStockLevel").default(0).notNull(),
  supplierId: int("supplierId").references(() => suppliers.id, { onDelete: "set null", onUpdate: "cascade" }),
  status: mysqlEnum("status", ["available", "low_stock", "out_of_stock"]).default("available").notNull(),
  dateAdded: mariadbTimestamp("dateAdded").default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastUpdated: mariadbTimestamp("lastUpdated").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  supplierIdx: index("products_supplier_idx").on(table.supplierId),
  statusIdx: index("products_status_idx").on(table.status),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Inventory transaction log for stock in/out adjustments.
 */
export const inventoryTransactions = mysqlTable("inventoryTransactions", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  transactionType: mysqlEnum("transactionType", ["stock_in", "stock_out", "sale", "adjustment"]).default("stock_in").notNull(),
  quantity: int("quantity").default(0).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  productIdx: index("inventory_transactions_product_idx").on(table.productId),
  createdAtIdx: index("inventory_transactions_created_at_idx").on(table.createdAt),
}));

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;

/**
 * POS sales records.
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  sessionId: int("sessionId").references(() => sessions.id, { onDelete: "set null", onUpdate: "cascade" }),
  saleNumber: varchar("saleNumber", { length: 120 }).notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "pos", "mobile"]).default("cash").notNull(),
  status: mysqlEnum("status", ["completed", "cancelled"]).default("completed").notNull(),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  customerIdx: index("sales_customer_idx").on(table.customerId),
  sessionIdx: index("sales_session_idx").on(table.sessionId),
  statusIdx: index("sales_status_idx").on(table.status),
}));

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * POS sale items.
 */
export const saleItems = mysqlTable("saleItems", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull().references(() => sales.id, { onDelete: "cascade", onUpdate: "cascade" }),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  saleIdx: index("sale_items_sale_idx").on(table.saleId),
  productIdx: index("sale_items_product_idx").on(table.productId),
}));

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

/**
 * Catalog of supported printing services.
 */
export const printServices = mysqlTable("printServices", {
  id: int("id").autoincrement().primaryKey(),
  serviceCode: varchar("serviceCode", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  colorOption: mysqlEnum("colorOption", ["black_white", "color"]).default("black_white").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PrintService = typeof printServices.$inferSelect;
export type InsertPrintService = typeof printServices.$inferInsert;

/**
 * Print job tracking table
 */
export const printJobs = mysqlTable("printJobs", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  sessionId: int("sessionId").default(0).notNull().references(() => sessions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  computerId: int("computerId").default(0).notNull().references(() => computers.id, { onDelete: "restrict", onUpdate: "cascade" }),
  serviceId: int("serviceId").references(() => printServices.id, { onDelete: "set null", onUpdate: "cascade" }),
  jobName: varchar("jobName", { length: 255 }).notNull(),
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  paperSize: mysqlEnum("paperSize", ["A4", "A3", "Letter", "Legal"]).default("A4").notNull(),
  printType: mysqlEnum("printType", ["single_sided", "double_sided"]).default("single_sided").notNull(),
  colorOption: mysqlEnum("colorOption", ["black_white", "color"]).default("black_white").notNull(),
  pageCount: int("pageCount").default(0).notNull(),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["pending", "printing", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("print_jobs_session_idx").on(table.sessionId),
  customerIdx: index("print_jobs_customer_idx").on(table.customerId),
  statusIdx: index("print_jobs_status_idx").on(table.status),
}));

export type PrintJob = typeof printJobs.$inferSelect;
export type InsertPrintJob = typeof printJobs.$inferInsert;

/**
 * Queue order for current print jobs.
 */
export const printQueues = mysqlTable("printQueues", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull().unique(),
  queueOrder: int("queueOrder").default(0).notNull(),
  status: mysqlEnum("status", ["waiting", "processing", "completed", "cancelled"]).default("waiting").notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PrintQueue = typeof printQueues.$inferSelect;
export type InsertPrintQueue = typeof printQueues.$inferInsert;

/**
 * System settings and configuration
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  description: text("description"),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

export const systemConfig = mysqlTable("systemConfig", {
  id: int("id").autoincrement().primaryKey(),
  general: json("general"),
  business: json("business"),
  pc: json("pc"),
  receipt: json("receipt"),
  notifications: json("notifications"),
  security: json("security"),
  backup: json("backup"),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

export const backupHistory = mysqlTable("backupHistory", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  filePath: varchar("filePath", { length: 500 }),
  sizeBytes: int("sizeBytes").default(0).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type BackupHistory = typeof backupHistory.$inferSelect;
export type InsertBackupHistory = typeof backupHistory.$inferInsert;

/**
 * Audit log for security and tracking
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  computerId: int("computerId"),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notifications table for real-time alerts
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  sessionId: int("sessionId").references(() => sessions.id, { onDelete: "set null", onUpdate: "cascade" }),
  computerId: int("computerId").references(() => computers.id, { onDelete: "set null", onUpdate: "cascade" }),
  notificationType: mysqlEnum("notificationType", [
    "session_expired",
    "time_warning",
    "pc_offline",
    "payment_failed",
    "low_balance",
    "system_alert",
    "maintenance_alert"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  soundAlert: boolean("soundAlert").default(false).notNull(),
  pushNotification: boolean("pushNotification").default(false).notNull(),
  emailNotification: boolean("emailNotification").default(false).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  readAt: mariadbTimestamp("readAt"),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification preferences for users
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  enableSessionExpired: boolean("enableSessionExpired").default(true).notNull(),
  enableTimeWarning: boolean("enableTimeWarning").default(true).notNull(),
  enablePcOffline: boolean("enablePcOffline").default(true).notNull(),
  enablePaymentFailed: boolean("enablePaymentFailed").default(true).notNull(),
  enableLowBalance: boolean("enableLowBalance").default(true).notNull(),
  enableSystemAlert: boolean("enableSystemAlert").default(true).notNull(),
  enableSoundAlerts: boolean("enableSoundAlerts").default(true).notNull(),
  enablePushNotifications: boolean("enablePushNotifications").default(true).notNull(),
  enableEmailNotifications: boolean("enableEmailNotifications").default(false).notNull(),
  timeWarningMinutes: int("timeWarningMinutes").default(5).notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const trialRegistrations = mysqlTable("trialRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  businessName: varchar("businessName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }).notNull(),
  numberOfPcs: int("numberOfPcs").notNull(),
  status: mysqlEnum("status", ["pending_setup", "converted", "rejected"]).default("pending_setup").notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type TrialRegistration = typeof trialRegistrations.$inferSelect;
export type InsertTrialRegistration = typeof trialRegistrations.$inferInsert;

export const salesInquiries = mysqlTable("salesInquiries", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  businessName: varchar("businessName", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  numberOfPcs: int("numberOfPcs").notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  createdAt: mariadbTimestamp("createdAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: mariadbTimestamp("updatedAt").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  statusIdx: index("sales_inquiries_status_idx").on(table.status),
  createdAtIdx: index("sales_inquiries_created_at_idx").on(table.createdAt),
}));

export type SalesInquiry = typeof salesInquiries.$inferSelect;
export type InsertSalesInquiry = typeof salesInquiries.$inferInsert;