CREATE TABLE `discovery_demand` (
	`use_case` text PRIMARY KEY NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_status` text DEFAULT 'missing' NOT NULL;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_headline` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_buy_left` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_buy_right` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_evidence_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_preset` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_scoring_version` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_data_version` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_drafted_at` text;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `verdict_approved_at` text;