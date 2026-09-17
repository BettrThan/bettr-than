ALTER TABLE `catalog_products` ADD `spec_provenance_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `spec_conflicts_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `status` text DEFAULT 'published' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_catalog_products_category_status` ON `catalog_products` (`category_slug`,`status`);--> statement-breakpoint
ALTER TABLE `comparisons` ADD `coverage_percent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `scoring_version` text DEFAULT 'headphones-v1-legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `eligibility_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `approved_at` text;--> statement-breakpoint
CREATE INDEX `idx_comparisons_category_status` ON `comparisons` (`category_slug`,`status`);--> statement-breakpoint
ALTER TABLE `ingestion_jobs` ADD `spec_provenance_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `ingestion_jobs` ADD `spec_conflicts_json` text DEFAULT '[]' NOT NULL;