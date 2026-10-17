CREATE TABLE `action_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`desk_id` text NOT NULL,
	`scope` text DEFAULT 'desk:action' NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`idempotency_key` text NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`desk_id`) REFERENCES `desks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `action_grants_idempotency_key_unique` ON `action_grants` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` text NOT NULL,
	`actor_user_id` text,
	`actor_role` text,
	`desk_id` text,
	`pin_staff_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`ip` text,
	`request_id` text
);
--> statement-breakpoint
CREATE TABLE `desks` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`room_id` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `desks_code_unique` ON `desks` (`code`);--> statement-breakpoint
CREATE TABLE `modalities` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name_en` text NOT NULL,
	`name_bn` text NOT NULL,
	`default_duration_min` integer NOT NULL,
	`default_price_paisa` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modalities_code_unique` ON `modalities` (`code`);--> statement-breakpoint
CREATE TABLE `pin_credentials` (
	`staff_id` text PRIMARY KEY NOT NULL,
	`pin_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`updated_at` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `refresh_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`device_label` text,
	`ip` text,
	`user_agent` text,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`rotated_from_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_sessions_token_hash_unique` ON `refresh_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE TABLE `sequences` (
	`scope` text NOT NULL,
	`year` integer NOT NULL,
	`last_value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`scope`, `year`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`desk_id` text,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`desk_id`) REFERENCES `desks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`specialization` text,
	`fee_override_paisa` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`must_change_password` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);