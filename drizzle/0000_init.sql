CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(100) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_log` (
	`log_id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36),
	`action` varchar(150) NOT NULL,
	`target_entity` varchar(80) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`details` text,
	`date_logged` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `activity_log_log_id` PRIMARY KEY(`log_id`)
);
--> statement-breakpoint
CREATE TABLE `administrator` (
	`user_id` varchar(36) NOT NULL,
	`office` varchar(150) NOT NULL,
	`admin_level` enum('ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'ADMIN',
	CONSTRAINT `administrator_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `announcement` (
	`announcement_id` int AUTO_INCREMENT NOT NULL,
	`admin_id` varchar(36) NOT NULL,
	`title` varchar(150) NOT NULL,
	`body` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`date_posted` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `announcement_announcement_id` PRIMARY KEY(`announcement_id`)
);
--> statement-breakpoint
CREATE TABLE `category` (
	`category_id` int AUTO_INCREMENT NOT NULL,
	`category_name` varchar(100) NOT NULL,
	`parent_category_id` int,
	CONSTRAINT `category_category_id` PRIMARY KEY(`category_id`)
);
--> statement-breakpoint
CREATE TABLE `claim` (
	`claim_id` int AUTO_INCREMENT NOT NULL,
	`report_id` int NOT NULL,
	`claimant_id` varchar(36) NOT NULL,
	`match_id` int,
	`reviewed_by` varchar(36),
	`claim_date` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`claim_status` enum('PENDING','MORE_INFO_NEEDED','APPROVED','REJECTED','RELEASED','LAPSED','ON_HOLD') NOT NULL DEFAULT 'PENDING',
	`rejection_reason` text,
	`remarks` text,
	`date_reviewed` timestamp(3),
	`pickup_deadline` timestamp(3),
	`date_released` timestamp(3),
	`released_by` varchar(36),
	`reminder_sent` boolean NOT NULL DEFAULT false,
	CONSTRAINT `claim_claim_id` PRIMARY KEY(`claim_id`)
);
--> statement-breakpoint
CREATE TABLE `claim_proof` (
	`proof_id` int AUTO_INCREMENT NOT NULL,
	`claim_id` int NOT NULL,
	`proof_type` enum('DESCRIPTION','PHOTO','RECEIPT','DOCUMENT','OTHER') NOT NULL,
	`file_path` varchar(500),
	`description` text,
	`date_uploaded` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `claim_proof_proof_id` PRIMARY KEY(`proof_id`)
);
--> statement-breakpoint
CREATE TABLE `college` (
	`college_id` int AUTO_INCREMENT NOT NULL,
	`college_name` varchar(150) NOT NULL,
	CONSTRAINT `college_college_id` PRIMARY KEY(`college_id`),
	CONSTRAINT `college_college_name_unique` UNIQUE(`college_name`)
);
--> statement-breakpoint
CREATE TABLE `faculty` (
	`user_id` varchar(36) NOT NULL,
	`department` varchar(150) NOT NULL,
	`academic_rank` varchar(80) NOT NULL,
	CONSTRAINT `faculty_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `location` (
	`location_id` int AUTO_INCREMENT NOT NULL,
	`building_name` varchar(150) NOT NULL,
	`area_description` varchar(255),
	`room_number` varchar(50),
	`storage_bin` varchar(50),
	`is_storage` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `location_location_id` PRIMARY KEY(`location_id`)
);
--> statement-breakpoint
CREATE TABLE `match_record` (
	`match_id` int AUTO_INCREMENT NOT NULL,
	`lost_report_id` int NOT NULL,
	`found_report_id` int NOT NULL,
	`match_score` decimal(5,2) NOT NULL,
	`match_status` enum('PENDING_VERIFICATION','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
	`date_matched` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `match_record_match_id` PRIMARY KEY(`match_id`),
	CONSTRAINT `match_pair_idx` UNIQUE(`lost_report_id`,`found_report_id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`notification_id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`report_id` int,
	`claim_id` int,
	`notification_type` varchar(50) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(255),
	`is_read` boolean NOT NULL DEFAULT false,
	`date_sent` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notification_notification_id` PRIMARY KEY(`notification_id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`count` int NOT NULL,
	`last_request` bigint NOT NULL,
	CONSTRAINT `rate_limit_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limit_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `report` (
	`report_id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`category_id` int NOT NULL,
	`location_id` int NOT NULL,
	`location_note` varchar(255),
	`storage_location_id` int,
	`report_type` enum('LOST','FOUND') NOT NULL,
	`item_name` varchar(150) NOT NULL,
	`description` text,
	`hidden_details` text,
	`color` varchar(50),
	`brand` varchar(100),
	`date_lost_or_found` date NOT NULL,
	`status` enum('PENDING','VERIFIED','CLAIMED','CLOSED','EXPIRED','ARCHIVED') NOT NULL DEFAULT 'PENDING',
	`verified_by` varchar(36),
	`date_verified` timestamp(3),
	`date_reported` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `report_report_id` PRIMARY KEY(`report_id`)
);
--> statement-breakpoint
CREATE TABLE `report_image` (
	`image_id` int AUTO_INCREMENT NOT NULL,
	`report_id` int NOT NULL,
	`image_path` varchar(500) NOT NULL,
	`date_uploaded` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `report_image_image_id` PRIMARY KEY(`image_id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`user_id` varchar(36) NOT NULL,
	`office` varchar(150) NOT NULL,
	`position` varchar(100) NOT NULL,
	CONSTRAINT `staff_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `student` (
	`user_id` varchar(36) NOT NULL,
	`course` varchar(150) NOT NULL,
	`year_level` int NOT NULL,
	CONSTRAINT `student_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`id_number` varchar(50) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`contact_no` varchar(30),
	`role` enum('student','faculty','staff','admin') NOT NULL DEFAULT 'student',
	`college_id` int,
	`status` enum('ACTIVE','DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_id_number_unique` UNIQUE(`id_number`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `administrator` ADD CONSTRAINT `administrator_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement` ADD CONSTRAINT `announcement_admin_id_user_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim` ADD CONSTRAINT `claim_report_id_report_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim` ADD CONSTRAINT `claim_claimant_id_user_id_fk` FOREIGN KEY (`claimant_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim` ADD CONSTRAINT `claim_match_id_match_record_match_id_fk` FOREIGN KEY (`match_id`) REFERENCES `match_record`(`match_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim` ADD CONSTRAINT `claim_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim` ADD CONSTRAINT `claim_released_by_user_id_fk` FOREIGN KEY (`released_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claim_proof` ADD CONSTRAINT `claim_proof_claim_id_claim_claim_id_fk` FOREIGN KEY (`claim_id`) REFERENCES `claim`(`claim_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faculty` ADD CONSTRAINT `faculty_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_record` ADD CONSTRAINT `match_record_lost_report_id_report_report_id_fk` FOREIGN KEY (`lost_report_id`) REFERENCES `report`(`report_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_record` ADD CONSTRAINT `match_record_found_report_id_report_report_id_fk` FOREIGN KEY (`found_report_id`) REFERENCES `report`(`report_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_report_id_report_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_claim_id_claim_claim_id_fk` FOREIGN KEY (`claim_id`) REFERENCES `claim`(`claim_id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report` ADD CONSTRAINT `report_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report` ADD CONSTRAINT `report_category_id_category_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`category_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report` ADD CONSTRAINT `report_location_id_location_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `location`(`location_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report` ADD CONSTRAINT `report_storage_location_id_location_location_id_fk` FOREIGN KEY (`storage_location_id`) REFERENCES `location`(`location_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report` ADD CONSTRAINT `report_verified_by_user_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `report_image` ADD CONSTRAINT `report_image_report_id_report_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student` ADD CONSTRAINT `student_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_college_id_college_college_id_fk` FOREIGN KEY (`college_id`) REFERENCES `college`(`college_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_date_idx` ON `activity_log` (`date_logged`);--> statement-breakpoint
CREATE INDEX `claim_report_idx` ON `claim` (`report_id`);--> statement-breakpoint
CREATE INDEX `claim_claimant_idx` ON `claim` (`claimant_id`);--> statement-breakpoint
CREATE INDEX `claim_status_idx` ON `claim` (`claim_status`);--> statement-breakpoint
CREATE INDEX `claim_proof_claim_idx` ON `claim_proof` (`claim_id`);--> statement-breakpoint
CREATE INDEX `match_found_idx` ON `match_record` (`found_report_id`);--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `notification` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `report_user_idx` ON `report` (`user_id`);--> statement-breakpoint
CREATE INDEX `report_type_status_idx` ON `report` (`report_type`,`status`);--> statement-breakpoint
CREATE INDEX `report_category_idx` ON `report` (`category_id`);--> statement-breakpoint
CREATE INDEX `report_image_report_idx` ON `report_image` (`report_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);