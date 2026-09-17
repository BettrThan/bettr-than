CREATE TABLE `comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`pair_key` text NOT NULL,
	`category_slug` text NOT NULL,
	`left_product_id` text NOT NULL,
	`right_product_id` text NOT NULL,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`verdict` text,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_comparisons_slug` ON `comparisons` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_comparisons_pair` ON `comparisons` (`pair_key`);--> statement-breakpoint
CREATE INDEX `idx_comparisons_category` ON `comparisons` (`category_slug`,`published_at`);--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `specs_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `ingestion_jobs` ADD `specs_json` text DEFAULT '{}' NOT NULL;