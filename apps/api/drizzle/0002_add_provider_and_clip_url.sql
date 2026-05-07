ALTER TABLE `jobs` ADD `provider` text NOT NULL DEFAULT 'reap';--> statement-breakpoint
ALTER TABLE `experiments` ADD `provider` text NOT NULL DEFAULT 'reap';--> statement-breakpoint
ALTER TABLE `clips` ADD `clip_url` text;
