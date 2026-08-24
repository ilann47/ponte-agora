CREATE TABLE `traffic_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`score` integer NOT NULL,
	`raw_score` integer NOT NULL,
	`level` text NOT NULL,
	`vehicle_count` integer NOT NULL,
	`occupancy` real NOT NULL,
	`video_fps` real NOT NULL,
	`inference_fps` real NOT NULL,
	`observed_at` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` integer NOT NULL,
	`visit_date` text NOT NULL,
	`path` text NOT NULL,
	`referrer_host` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`country` text NOT NULL,
	`device` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`visitor_day_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_visit_events_date` ON `visit_events` (`visit_date`);--> statement-breakpoint
CREATE INDEX `idx_visit_events_referrer` ON `visit_events` (`referrer_host`);--> statement-breakpoint
CREATE INDEX `idx_visit_events_country` ON `visit_events` (`country`);--> statement-breakpoint
CREATE INDEX `idx_visit_events_visitor` ON `visit_events` (`visitor_hash`);