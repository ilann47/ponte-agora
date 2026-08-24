CREATE TABLE `newsletter_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_hash` text NOT NULL,
	`limit_date` text NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_rate_visitor_date` ON `newsletter_rate_limits` (`visitor_hash`,`limit_date`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_rate_date` ON `newsletter_rate_limits` (`limit_date`);--> statement-breakpoint
CREATE TABLE `newsletter_send_log` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`local_date` text NOT NULL,
	`status` text NOT NULL,
	`attempted_at` integer NOT NULL,
	`sent_at` integer,
	`provider_message_id` text,
	`error_code` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_send_once` ON `newsletter_send_log` (`subscription_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_send_status` ON `newsletter_send_log` (`status`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `newsletter_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`preferred_hour` integer NOT NULL,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`confirmation_sent_at` integer,
	`confirmed_at` integer,
	`unsubscribed_at` integer,
	`last_sent_date` text,
	`last_sent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_subscriptions_email` ON `newsletter_subscriptions` (`email`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_subscriptions_due` ON `newsletter_subscriptions` (`status`,`preferred_hour`,`last_sent_date`);--> statement-breakpoint
CREATE TABLE `traffic_samples` (
	`bucket_start` integer PRIMARY KEY NOT NULL,
	`sample_date` text NOT NULL,
	`sample_hour` integer NOT NULL,
	`score` integer NOT NULL,
	`raw_score` integer NOT NULL,
	`level` text NOT NULL,
	`vehicle_count` integer NOT NULL,
	`occupancy` real NOT NULL,
	`observed_at` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_traffic_samples_date` ON `traffic_samples` (`sample_date`);--> statement-breakpoint
CREATE INDEX `idx_traffic_samples_date_hour` ON `traffic_samples` (`sample_date`,`sample_hour`);