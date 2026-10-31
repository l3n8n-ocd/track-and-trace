CREATE INDEX `claim_status_date_idx` ON `claim` (`claim_status`,`claim_date`);--> statement-breakpoint
CREATE INDEX `claim_claimant_status_date_idx` ON `claim` (`claimant_id`,`claim_status`,`claim_date`);--> statement-breakpoint
CREATE INDEX `notification_user_date_idx` ON `notification` (`user_id`,`date_sent`);--> statement-breakpoint
CREATE INDEX `report_user_date_idx` ON `report` (`user_id`,`date_reported`);--> statement-breakpoint
CREATE INDEX `report_status_date_idx` ON `report` (`status`,`date_reported`);