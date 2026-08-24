CREATE TABLE `vehicle_counter_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`last_total` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicle_counts` (
	`count_date` text NOT NULL,
	`count_hour` integer NOT NULL,
	`vehicle_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`count_date`, `count_hour`)
);
--> statement-breakpoint
CREATE INDEX `idx_vehicle_counts_date` ON `vehicle_counts` (`count_date`);