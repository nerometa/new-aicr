// JobCompleter - centralizes job completion logic for both poller and webhook paths.
// Uses transaction for atomic clips insert + job status update.
// Returns { job, clips } for caller to use (e.g., SSE dispatch).

import { db } from '../db/client';
import { jobs, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider } from './providers';
import { randomUUID } from 'crypto';
import type { ProviderClip } from './providers/types';

export interface CompleteJobResult {
  job: typeof jobs.$inferSelect;
  clips: typeof clips.$inferSelect[];
}

/**
 * Complete a job: fetch clips from provider, persist to DB, mark job ready.
 * Uses transaction for atomicity.
 * Caller is responsible for removing job from polling queue after this returns.
 */
export async function completeJob(jobId: string): Promise<CompleteJobResult> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (!job.providerProjectId) {
    throw new Error(`Job ${jobId} has no providerProjectId`);
  }

  const provider = getProvider(job.provider);
  const providerClips = await provider.getClips(job.providerProjectId);

  // Transaction: insert clips + update job status atomically
  const result = await db.transaction(async (tx) => {
    // Update job status first
    await tx.update(jobs)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    // Insert clips
    const insertedClips: typeof clips.$inferSelect[] = [];
    for (const c of providerClips) {
      const inserted = await tx.insert(clips).values({
        id: randomUUID(),
        jobId,
        providerClipId: c.providerClipId,
        title: c.title,
        viralityScore: c.viralityScore,
        viralityScoreExplanation: c.viralityScoreExplanation,
        duration: c.duration,
        startTime: c.startTime,
        endTime: c.endTime,
        clipUrl: c.clipUrl ?? null,
        createdAt: new Date(),
      }).returning();

      if (inserted && inserted.length > 0) {
        insertedClips.push(inserted[0]!);
      }
    }

    // Re-fetch job to get updated status
    const [updatedJob] = await tx.select().from(jobs).where(eq(jobs.id, jobId));
    if (!updatedJob) {
      throw new Error(`Job ${jobId} not found after update`);
    }

    return { job: updatedJob, clips: insertedClips };
  });

  console.log(`[Completion] Job ${jobId} completed with ${result.clips.length} clips`);
  return result;
}

/**
 * Mark job as failed. Used by both poller and webhook paths.
 * Caller is responsible for removing job from polling queue.
 */
export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  await db.update(jobs)
    .set({ status: 'error', errorMessage, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
  console.log(`[Completion] Job ${jobId} marked failed: ${errorMessage}`);
}
