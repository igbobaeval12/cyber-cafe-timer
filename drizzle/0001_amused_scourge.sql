ALTER TABLE `sessions` DROP INDEX `active_session_per_computer_idx`;--> statement-breakpoint
CREATE INDEX `active_session_per_computer_idx` ON `sessions` (`computerId`,`sessionStatus`);