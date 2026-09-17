CREATE TABLE `catalog_products` (
	`id` text PRIMARY KEY NOT NULL,
	`ingestion_job_id` text NOT NULL,
	`slug` text NOT NULL,
	`canonical_name` text NOT NULL,
	`brand` text NOT NULL,
	`category_slug` text NOT NULL,
	`source_url` text NOT NULL,
	`image_url` text,
	`description` text,
	`facts_json` text NOT NULL,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_products_job` ON `catalog_products` (`ingestion_job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_products_slug` ON `catalog_products` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_catalog_products_category` ON `catalog_products` (`category_slug`,`published_at`);--> statement-breakpoint
CREATE TABLE `ingestion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`submitted_by` text NOT NULL,
	`source_url` text NOT NULL,
	`source_host` text NOT NULL,
	`category_slug` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`canonical_name` text,
	`brand` text,
	`image_url` text,
	`description` text,
	`extracted_json` text,
	`normalized_json` text,
	`conflicts_json` text DEFAULT '[]' NOT NULL,
	`error_message` text,
	`review_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_ingestion_jobs_status_created` ON `ingestion_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ingestion_jobs_name` ON `ingestion_jobs` (`canonical_name`);--> statement-breakpoint
PRAGMA optimize;
