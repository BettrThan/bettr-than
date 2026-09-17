CREATE TABLE `research_publications` (
	`batch_id` text PRIMARY KEY NOT NULL,
	`accepted` integer NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	CONSTRAINT "research_publication_preconditions" CHECK("research_publications"."accepted" = 1)
);
