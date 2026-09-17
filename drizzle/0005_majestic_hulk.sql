CREATE TABLE `vote_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comparison_slug` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`network_hash` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vote_attempts_nonce` ON `vote_attempts` (`nonce_hash`);--> statement-breakpoint
CREATE INDEX `idx_vote_attempts_visitor_created` ON `vote_attempts` (`visitor_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_vote_attempts_network_created` ON `vote_attempts` (`network_hash`,`created_at`);--> statement-breakpoint
DROP INDEX `idx_votes_comparison_visitor`;--> statement-breakpoint
ALTER TABLE `votes` ADD `dimension_type` text DEFAULT 'overall' NOT NULL;--> statement-breakpoint
ALTER TABLE `votes` ADD `dimension_key` text DEFAULT 'overall' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_votes_comparison_visitor_dimension` ON `votes` (`comparison_slug`,`visitor_id`,`dimension_type`,`dimension_key`);