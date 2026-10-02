CREATE TABLE `salesInquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`businessName` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`numberOfPcs` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `salesInquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sales_inquiries_status_idx` ON `salesInquiries` (`status`);
--> statement-breakpoint
CREATE INDEX `sales_inquiries_created_at_idx` ON `salesInquiries` (`createdAt`);
--> statement-breakpoint
CREATE TABLE `trialRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`businessName` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`numberOfPcs` int NOT NULL,
	`status` enum('pending_setup','converted','rejected') NOT NULL DEFAULT 'pending_setup',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `trialRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `trialRegistrations_email_unique` UNIQUE(`email`)
);