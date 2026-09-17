CREATE TABLE `offer_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`clicked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_offer_clicks_offer_time` ON `offer_clicks` (`offer_id`,`clicked_at`);--> statement-breakpoint
CREATE TABLE `price_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offer_id` text NOT NULL,
	`price_minor` integer NOT NULL,
	`shipping_minor` integer,
	`total_price_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`availability` text NOT NULL,
	`source_type` text NOT NULL,
	`observed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_price_observations_offer_time` ON `price_observations` (`offer_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `product_retailer_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`retailer_id` text NOT NULL,
	`provider_key` text DEFAULT 'manual' NOT NULL,
	`provider_product_id` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_retailer_mapping` ON `product_retailer_mappings` (`product_id`,`retailer_id`,`provider_key`);--> statement-breakpoint
CREATE INDEX `idx_product_retailer_mapping_status` ON `product_retailer_mappings` (`status`,`product_id`);--> statement-breakpoint
CREATE TABLE `retailer_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_key` text NOT NULL,
	`product_id` text NOT NULL,
	`retailer_id` text NOT NULL,
	`mapping_id` text,
	`provider_key` text DEFAULT 'manual' NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`destination_url` text NOT NULL,
	`price_minor` integer NOT NULL,
	`shipping_minor` integer,
	`total_price_minor` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`availability` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`is_affiliate` integer DEFAULT false NOT NULL,
	`is_sponsored` integer DEFAULT false NOT NULL,
	`last_checked_at` text NOT NULL,
	`stale_after_at` text NOT NULL,
	`provider_error` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_retailer_offers_identity` ON `retailer_offers` (`product_id`,`retailer_id`,`offer_key`);--> statement-breakpoint
CREATE INDEX `idx_retailer_offers_public` ON `retailer_offers` (`product_id`,`status`,`availability`);--> statement-breakpoint
CREATE INDEX `idx_retailer_offers_retailer` ON `retailer_offers` (`retailer_id`,`status`);--> statement-breakpoint
CREATE TABLE `retailers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`homepage_url` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`affiliate_status` text DEFAULT 'none' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_retailers_slug` ON `retailers` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_retailers_enabled_name` ON `retailers` (`enabled`,`name`);