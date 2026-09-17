CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`journey_id` text,
	`category_slug` text,
	`comparison_slug` text,
	`product_ids_json` text DEFAULT '[]' NOT NULL,
	`preset_key` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`recorded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_event_time` ON `analytics_events` (`event_name`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_comparison_time` ON `analytics_events` (`comparison_slug`,`recorded_at`);