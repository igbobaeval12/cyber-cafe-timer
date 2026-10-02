CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`computerId` int,
	`action` varchar(100) NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backupHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`type` varchar(40) NOT NULL,
	`filePath` varchar(500),
	`sizeBytes` int NOT NULL DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `backupHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int,
	`computerId` int NOT NULL,
	`pricingType` enum('hourly','fixed','custom') NOT NULL DEFAULT 'hourly',
	`hourlyRate` decimal(10,2) NOT NULL DEFAULT '0',
	`fixedPackagePrice` decimal(10,2) NOT NULL DEFAULT '0',
	`customPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`durationMinutes` int NOT NULL DEFAULT 0,
	`baseCharge` decimal(10,2) NOT NULL DEFAULT '0',
	`additionalCharges` decimal(10,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('paid','unpaid') NOT NULL DEFAULT 'unpaid',
	`paymentMethod` enum('cash','bank_transfer','pos','mobile') NOT NULL DEFAULT 'cash',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `bills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `computers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pcNumber` int,
	`pcName` varchar(100) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'offline',
	`currentCustomer` varchar(100),
	`remainingTime` varchar(50),
	`currentSession` varchar(100),
	`hourlyRate` decimal(10,2) NOT NULL DEFAULT '0',
	`lastActivity` datetime,
	`ipAddress` varchar(45),
	`macAddress` varchar(17),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastHeartbeat` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `computers_id` PRIMARY KEY(`id`),
	CONSTRAINT `computers_pcName_unique` UNIQUE(`pcName`)
);
--> statement-breakpoint
CREATE TABLE `inventoryTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`transactionType` enum('stock_in','stock_out','sale','adjustment') NOT NULL DEFAULT 'stock_in',
	`quantity` int NOT NULL DEFAULT 0,
	`unitCost` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enableSessionExpired` boolean NOT NULL DEFAULT true,
	`enableTimeWarning` boolean NOT NULL DEFAULT true,
	`enablePcOffline` boolean NOT NULL DEFAULT true,
	`enablePaymentFailed` boolean NOT NULL DEFAULT true,
	`enableLowBalance` boolean NOT NULL DEFAULT true,
	`enableSystemAlert` boolean NOT NULL DEFAULT true,
	`enableSoundAlerts` boolean NOT NULL DEFAULT true,
	`enablePushNotifications` boolean NOT NULL DEFAULT true,
	`enableEmailNotifications` boolean NOT NULL DEFAULT false,
	`timeWarningMinutes` int NOT NULL DEFAULT 5,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`computerId` int,
	`notificationType` enum('session_expired','time_warning','pc_offline','payment_failed','low_balance','system_alert','maintenance_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(500),
	`soundAlert` boolean NOT NULL DEFAULT false,
	`pushNotification` boolean NOT NULL DEFAULT false,
	`emailNotification` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`readAt` datetime,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`billId` int NOT NULL,
	`sessionId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','pos','mobile') NOT NULL DEFAULT 'cash',
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
	`referenceNumber` varchar(100),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricingConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`hourlyRate` decimal(10,2) NOT NULL,
	`minimumCharge` decimal(10,2) NOT NULL DEFAULT '0',
	`discountPercentage` decimal(5,2) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `pricingConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `printJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`sessionId` int NOT NULL DEFAULT 0,
	`computerId` int NOT NULL DEFAULT 0,
	`serviceId` int,
	`jobName` varchar(255) NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`paperSize` enum('A4','A3','Letter','Legal') NOT NULL DEFAULT 'A4',
	`printType` enum('single_sided','double_sided') NOT NULL DEFAULT 'single_sided',
	`colorOption` enum('black_white','color') NOT NULL DEFAULT 'black_white',
	`pageCount` int NOT NULL DEFAULT 0,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`totalCost` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('pending','printing','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `printJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `printQueues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`queueOrder` int NOT NULL DEFAULT 0,
	`status` enum('waiting','processing','completed','cancelled') NOT NULL DEFAULT 'waiting',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `printQueues_id` PRIMARY KEY(`id`),
	CONSTRAINT `printQueues_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `printServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceCode` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`colorOption` enum('black_white','color') NOT NULL DEFAULT 'black_white',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `printServices_id` PRIMARY KEY(`id`),
	CONSTRAINT `printServices_serviceCode_unique` UNIQUE(`serviceCode`)
);
--> statement-breakpoint
CREATE TABLE `productCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `productCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `productCategories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(120),
	`name` varchar(255) NOT NULL,
	`category` varchar(120) NOT NULL DEFAULT 'general',
	`barcode` varchar(120),
	`description` text,
	`costPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`sellingPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`quantityInStock` int NOT NULL DEFAULT 0,
	`minimumStockLevel` int NOT NULL DEFAULT 0,
	`supplierId` int,
	`status` enum('available','low_stock','out_of_stock') NOT NULL DEFAULT 'available',
	`dateAdded` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`lastUpdated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_productCode_unique` UNIQUE(`productCode`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`billId` int,
	`sessionId` int NOT NULL,
	`receiptNumber` varchar(50) NOT NULL,
	`userId` int,
	`computerId` int NOT NULL,
	`customerName` varchar(255),
	`startTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`endTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`durationMinutes` int NOT NULL,
	`servicesUsed` text,
	`itemizedCharges` text,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','pos','mobile') NOT NULL,
	`staffName` varchar(255),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipts_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`sessionId` int,
	`saleNumber` varchar(120) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`paymentMethod` enum('cash','bank_transfer','pos','mobile') NOT NULL DEFAULT 'cash',
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_saleNumber_unique` UNIQUE(`saleNumber`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`computerId` int NOT NULL,
	`userId` int,
	`pricingConfigId` int NOT NULL,
	`sessionStatus` enum('active','paused','completed','expired') NOT NULL DEFAULT 'active',
	`paymentMode` enum('prepaid','postpaid') NOT NULL DEFAULT 'postpaid',
	`startTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`endTime` datetime,
	`pausedTime` datetime,
	`totalDurationMinutes` int NOT NULL DEFAULT 0,
	`totalCost` decimal(10,2) NOT NULL DEFAULT '0',
	`sessionToken` varchar(255),
	`tokenExpiresAt` datetime,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionToken_unique` UNIQUE(`sessionToken`),
	CONSTRAINT `active_session_per_computer_idx` UNIQUE(`computerId`,`sessionStatus`)
);
--> statement-breakpoint
CREATE TABLE `staffActivityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int,
	`action` varchar(120) NOT NULL,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `staffActivityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffLoginHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`loginAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`success` boolean NOT NULL DEFAULT true,
	`details` text,
	CONSTRAINT `staffLoginHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`label` varchar(160) NOT NULL,
	`description` text,
	`category` varchar(80),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `staffPermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffPermissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `staffRolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `staffRolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_role_permissions_unique_idx` UNIQUE(`roleId`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `staffRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`description` text,
	`permissions` json,
	`isSystem` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `staffRoles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffRoles_name_unique` UNIQUE(`name`),
	CONSTRAINT `staffRoles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `staffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` varchar(40) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`username` varchar(80) NOT NULL,
	`email` varchar(320),
	`phoneNumber` varchar(30),
	`passwordHash` text NOT NULL,
	`roleId` int NOT NULL,
	`profilePhoto` varchar(500),
	`employmentDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`salary` decimal(10,2),
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`lastLogin` datetime,
	`failedLoginAttempts` int NOT NULL DEFAULT 0,
	`isLocked` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `staffs_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffs_staffId_unique` UNIQUE(`staffId`),
	CONSTRAINT `staffs_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255),
	`phoneNumber` varchar(20),
	`email` varchar(320),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`general` json,
	`business` json,
	`pc` json,
	`receipt` json,
	`notifications` json,
	`security` json,
	`backup` json,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `systemConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` text,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int,
	`transactionType` enum('session_charge','prepaid_deposit','refund','print_charge','sale_charge') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','card','prepaid_balance','other') NOT NULL,
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`receiptNumber` varchar(50),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`username` varchar(64),
	`passwordHash` text,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`phoneNumber` varchar(20),
	`membershipTier` enum('walk_in','regular','vip','student','corporate','none','basic','premium') NOT NULL DEFAULT 'walk_in',
	`customerStatus` enum('active','inactive','blacklisted') NOT NULL DEFAULT 'active',
	`prepaidBalance` decimal(10,2) NOT NULL DEFAULT '0',
	`loyaltyPoints` int NOT NULL DEFAULT 0,
	`customerNotes` text,
	`registeredAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`lastSignedIn` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `bills` ADD CONSTRAINT `bills_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `bills` ADD CONSTRAINT `bills_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `bills` ADD CONSTRAINT `bills_computerId_computers_id_fk` FOREIGN KEY (`computerId`) REFERENCES `computers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_computerId_computers_id_fk` FOREIGN KEY (`computerId`) REFERENCES `computers`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_billId_bills_id_fk` FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_computerId_computers_id_fk` FOREIGN KEY (`computerId`) REFERENCES `computers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_serviceId_printServices_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `printServices`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_billId_bills_id_fk` FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_computerId_computers_id_fk` FOREIGN KEY (`computerId`) REFERENCES `computers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_computerId_computers_id_fk` FOREIGN KEY (`computerId`) REFERENCES `computers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_pricingConfigId_pricingConfigs_id_fk` FOREIGN KEY (`pricingConfigId`) REFERENCES `pricingConfigs`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `staffActivityLogs` ADD CONSTRAINT `staffActivityLogs_staffId_staffs_id_fk` FOREIGN KEY (`staffId`) REFERENCES `staffs`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `staffLoginHistory` ADD CONSTRAINT `staffLoginHistory_staffId_staffs_id_fk` FOREIGN KEY (`staffId`) REFERENCES `staffs`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `staffs` ADD CONSTRAINT `staffs_roleId_staffRoles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `staffRoles`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `bills_session_idx` ON `bills` (`sessionId`);--> statement-breakpoint
CREATE INDEX `bills_user_idx` ON `bills` (`userId`);--> statement-breakpoint
CREATE INDEX `bills_status_idx` ON `bills` (`status`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_product_idx` ON `inventoryTransactions` (`productId`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_created_at_idx` ON `inventoryTransactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_is_read_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `payments_bill_idx` ON `payments` (`billId`);--> statement-breakpoint
CREATE INDEX `payments_session_idx` ON `payments` (`sessionId`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `print_jobs_session_idx` ON `printJobs` (`sessionId`);--> statement-breakpoint
CREATE INDEX `print_jobs_customer_idx` ON `printJobs` (`customerId`);--> statement-breakpoint
CREATE INDEX `print_jobs_status_idx` ON `printJobs` (`status`);--> statement-breakpoint
CREATE INDEX `products_supplier_idx` ON `products` (`supplierId`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `receipts_session_idx` ON `receipts` (`sessionId`);--> statement-breakpoint
CREATE INDEX `receipts_bill_idx` ON `receipts` (`billId`);--> statement-breakpoint
CREATE INDEX `receipts_user_idx` ON `receipts` (`userId`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `saleItems` (`saleId`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `saleItems` (`productId`);--> statement-breakpoint
CREATE INDEX `sales_customer_idx` ON `sales` (`customerId`);--> statement-breakpoint
CREATE INDEX `sales_session_idx` ON `sales` (`sessionId`);--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_computer_idx` ON `sessions` (`computerId`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_pricing_config_idx` ON `sessions` (`pricingConfigId`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`sessionStatus`);--> statement-breakpoint
CREATE INDEX `sessions_start_time_idx` ON `sessions` (`startTime`);--> statement-breakpoint
CREATE INDEX `staff_activity_logs_staff_idx` ON `staffActivityLogs` (`staffId`);--> statement-breakpoint
CREATE INDEX `staff_activity_logs_action_idx` ON `staffActivityLogs` (`action`);--> statement-breakpoint
CREATE INDEX `staff_activity_logs_created_at_idx` ON `staffActivityLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `staff_login_history_staff_idx` ON `staffLoginHistory` (`staffId`);--> statement-breakpoint
CREATE INDEX `staff_login_history_success_idx` ON `staffLoginHistory` (`success`);--> statement-breakpoint
CREATE INDEX `staff_login_history_login_at_idx` ON `staffLoginHistory` (`loginAt`);--> statement-breakpoint
CREATE INDEX `staff_role_permissions_role_idx` ON `staffRolePermissions` (`roleId`);--> statement-breakpoint
CREATE INDEX `staff_role_permissions_permission_idx` ON `staffRolePermissions` (`permissionId`);--> statement-breakpoint
CREATE INDEX `staffs_role_idx` ON `staffs` (`roleId`);--> statement-breakpoint
CREATE INDEX `staffs_status_idx` ON `staffs` (`status`);--> statement-breakpoint
CREATE INDEX `transactions_session_idx` ON `transactions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `transactions_status_idx` ON `transactions` (`status`);