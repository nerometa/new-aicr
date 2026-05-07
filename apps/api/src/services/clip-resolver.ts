// ClipResolver - centralizes clip URL resolution.
// Handles: stored clipUrl (Reka) → live getClipUrls() (Reap) → expiry signal.
// Returns ClipWithUrl[] with urlExpired flag when provider call fails.

import { db } from '../db/client';
import { jobs, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider } from './providers';

export interface ClipWithUrl {
  id: string;
  jobId: string;
  title: string | null;
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  duration: number | null;
  startTime: number | null;
  endTime: number | null;
  providerClipId: string;
  clipUrl: string | null;
  urlExpired?: boolean;
  createdAt: Date;
}

/**
 * Resolve clip URLs for a job.
 * - Uses stored clipUrl if present (Reka: URLs stored at completion)
 * - Falls back to live getClipUrls() if missing (Reap pattern)
 * - Returns urlExpired: true when provider call fails (e.g., project expired)
 */
export async function resolveClipUrls(jobId: string): Promise<ClipWithUrl[]> {
  // Fetch job to get provider and providerProjectId
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  // Fetch all clips for this job
  const jobClips = await db.select().from(clips).where(eq(clips.jobId, jobId));
  if (jobClips.length === 0) {
    return [];
  }

  // Build initial URL map from stored clipUrls (Reka: URLs stored at completion)
  const urlMap = new Map<string, string>();
  for (const c of jobClips) {
    if (c.clipUrl) {
      urlMap.set(c.providerClipId, c.clipUrl);
    }
  }

  // Check if any clips are still missing URLs
  const missingUrls = jobClips.some((c) => !urlMap.has(c.providerClipId));

  // If missing and we have a providerProjectId, fetch live (Reap pattern)
  let urlExpired = false;
  if (missingUrls && job.providerProjectId) {
    try {
      const provider = getProvider(job.provider);
      const liveMap = await provider.getClipUrls(job.providerProjectId);
      for (const [clipId, url] of liveMap) {
        if (!urlMap.has(clipId)) {
          urlMap.set(clipId, url);
        }
      }
    } catch (err) {
      console.error(`[ClipResolver] Failed to fetch clip URLs for job ${jobId}:`, err);
      // Mark as expired - provider call failed (project may be expired)
      urlExpired = true;
    }
  }

  // Map to response shape with URL resolution
  return jobClips.map((c): ClipWithUrl => ({
    id: c.id,
    jobId: c.jobId ?? jobId,
    title: c.title,
    viralityScore: c.viralityScore,
    viralityScoreExplanation: c.viralityScoreExplanation,
    duration: c.duration,
    startTime: c.startTime,
    endTime: c.endTime,
    providerClipId: c.providerClipId,
    clipUrl: urlMap.get(c.providerClipId) ?? null,
    urlExpired: urlExpired && !c.clipUrl ? true : undefined,
    createdAt: c.createdAt,
  }));
}
