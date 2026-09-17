CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comparison_slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`choice_slug` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_votes_comparison_visitor` ON `votes` (`comparison_slug`,`visitor_id`);