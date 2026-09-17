CREATE TABLE `research_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`digest` text NOT NULL,
	`title` text NOT NULL,
	`category_slug` text NOT NULL,
	`payload_json` text NOT NULL,
	`baseline_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploaded_at` text NOT NULL,
	`published_at` text,
	`published_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_research_batches_status_time` ON `research_batches` (`status`,`uploaded_at`);