CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message_en` text NOT NULL,
	`message_bn` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`target_screens` text DEFAULT 'all' NOT NULL,
	`active_from` text NOT NULL,
	`active_until` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`slot_time` text NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`consultation_id` text,
	`template_type` text NOT NULL,
	`score_json` text NOT NULL,
	`total_score` integer NOT NULL,
	`outcome_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`punch_type` text NOT NULL,
	`desk_id` text,
	`timestamp` text NOT NULL,
	`ip` text,
	`note` text,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`desk_id`) REFERENCES `desks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`medicine_id` text NOT NULL,
	`batch_number` text NOT NULL,
	`mfg_date` text,
	`exp_date` text NOT NULL,
	`purchase_rate_paisa` integer NOT NULL,
	`mrp_paisa` integer NOT NULL,
	`quantity_in_stock` integer DEFAULT 0 NOT NULL,
	`is_blocked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `beds` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beds_code_unique` ON `beds` (`code`);--> statement-breakpoint
CREATE TABLE `bill_items` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text,
	`description` text NOT NULL,
	`unit_price_paisa` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`discount_paisa` integer DEFAULT 0 NOT NULL,
	`total_paisa` integer NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_number` text NOT NULL,
	`visit_id` text,
	`patient_id` text NOT NULL,
	`cashier_staff_id` text,
	`subtotal_paisa` integer NOT NULL,
	`discount_paisa` integer DEFAULT 0 NOT NULL,
	`discount_approved_by` text,
	`total_paisa` integer NOT NULL,
	`paid_paisa` integer DEFAULT 0 NOT NULL,
	`due_paisa` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payment_method` text DEFAULT 'cash',
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cashier_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discount_approved_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bills_bill_number_unique` ON `bills` (`bill_number`);--> statement-breakpoint
CREATE TABLE `cash_drawers` (
	`id` text PRIMARY KEY NOT NULL,
	`cashier_staff_id` text NOT NULL,
	`desk_id` text NOT NULL,
	`shift_id` text,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`opening_cash_paisa` integer NOT NULL,
	`closing_cash_actual_paisa` integer,
	`closing_cash_expected_paisa` integer,
	`variance_paisa` integer,
	`variance_reason` text,
	`status` text DEFAULT 'open' NOT NULL,
	`closed_by_admin_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cashier_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`desk_id`) REFERENCES `desks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`chief_complaints` text,
	`history` text,
	`vitals_json` text,
	`pain_score_vas` integer,
	`soap_notes_json` text,
	`diagnosis_icd_json` text,
	`investigations_advised_json` text,
	`follow_up_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `drawer_events` (
	`id` text PRIMARY KEY NOT NULL,
	`drawer_id` text NOT NULL,
	`event_type` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`description` text,
	`staff_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`drawer_id`) REFERENCES `cash_drawers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dues` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`bill_id` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`settled_paisa` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`voucher_number` text,
	`approved_by_staff_id` text,
	`paid_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`approved_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_id` text,
	`patient_id` text,
	`doctor_staff_id` text,
	`therapist_staff_id` text,
	`rating` integer NOT NULL,
	`comment` text,
	`channel` text DEFAULT 'kiosk' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`room_id` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`min_stock_level` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_items_code_unique` ON `inventory_items` (`code`);--> statement-breakpoint
CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`modality_code` text,
	`status` text DEFAULT 'available' NOT NULL,
	`last_serviced_at` text,
	`next_service_due` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modality_code`) REFERENCES `modalities`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `machines_code_unique` ON `machines` (`code`);--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_name` text NOT NULL,
	`generic_name` text NOT NULL,
	`manufacturer` text,
	`form` text DEFAULT 'tablet' NOT NULL,
	`strength` text,
	`min_stock_alert` integer DEFAULT 20 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `package_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`package_id` text NOT NULL,
	`bill_id` text,
	`remaining_consultations` integer NOT NULL,
	`remaining_sessions` integer NOT NULL,
	`purchased_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name_en` text NOT NULL,
	`name_bn` text NOT NULL,
	`total_consultations` integer DEFAULT 1 NOT NULL,
	`total_therapy_sessions` integer DEFAULT 10 NOT NULL,
	`validity_days` integer DEFAULT 30 NOT NULL,
	`price_paisa` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`mrn` text NOT NULL,
	`name_en` text NOT NULL,
	`name_bn` text,
	`phone` text NOT NULL,
	`date_of_birth` text,
	`age_years` integer,
	`gender` text NOT NULL,
	`blood_group` text,
	`address` text,
	`occupation` text,
	`emergency_contact` text,
	`allergies` text,
	`chronic_conditions` text,
	`contraindications` text,
	`photo_url` text,
	`consent_signed` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patients_mrn_unique` ON `patients` (`mrn`);--> statement-breakpoint
CREATE UNIQUE INDEX `patients_phone_unique` ON `patients` (`phone`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`method` text NOT NULL,
	`txn_id` text,
	`received_by_staff_id` text,
	`receipt_printed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prescription_items` (
	`id` text PRIMARY KEY NOT NULL,
	`prescription_id` text NOT NULL,
	`medicine_id` text,
	`medicine_name` text NOT NULL,
	`dosage` text NOT NULL,
	`duration_days` integer DEFAULT 7 NOT NULL,
	`instructions_bn` text,
	`instructions_en` text,
	`is_dispensed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text,
	`visit_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`advice` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `serials` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text NOT NULL,
	`date` text NOT NULL,
	`serial_number` integer NOT NULL,
	`visit_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`called_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`medicine_id` text NOT NULL,
	`move_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`actor_staff_id` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `therapy_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text,
	`visit_id` text,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`modality_code` text NOT NULL,
	`total_sessions_prescribed` integer DEFAULT 1 NOT NULL,
	`completed_sessions` integer DEFAULT 0 NOT NULL,
	`frequency` text DEFAULT 'daily',
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modality_code`) REFERENCES `modalities`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `therapy_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`patient_id` text NOT NULL,
	`therapist_staff_id` text,
	`bed_id` text,
	`machine_id` text,
	`modality_code` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`started_at` text,
	`ended_at` text,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`outcome_note` text,
	`pain_score_after` integer,
	`is_overtime` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `therapy_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`therapist_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modality_code`) REFERENCES `modalities`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text,
	`token_number` integer NOT NULL,
	`visit_date` text NOT NULL,
	`status` text DEFAULT 'checked_in' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`current_location` text DEFAULT 'reception',
	`checked_in_at` text,
	`checked_out_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
