-- Add unique constraint on clips(job_id, provider_clip_id) for idempotent retries
-- This ensures that retrying a job completion doesn't create duplicate clips.

CREATE UNIQUE INDEX IF NOT EXISTS `clips_job_provider_unique` ON `clips` (`job_id`, `provider_clip_id`);
