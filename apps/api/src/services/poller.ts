import { redis } from '../lib/redis';
import { db } from '../db/client';
import { jobs, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { provider } from './providers';
import { randomUUID } from 'crypto';

const QUEUE_KEY = 'aicr:polling_jobs';
const POLL_INTERVAL_MS = 30_000;

export const enqueueJob = (jobId: string) => redis.sadd(QUEUE_KEY, jobId);

export const startPoller = () => {
  setInterval(async () => {
    const jobIds: string[] = await redis.smembers(QUEUE_KEY);
    for (const jobId of jobIds) {
      await pollJob(jobId);
    }
  }, POLL_INTERVAL_MS);
};

export const processCompletedJob = async (jobId: string): Promise<void> => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job?.providerProjectId) {
    console.error(`[Poller] Job ${jobId} has no providerProjectId`);
    return;
  }

  const providerClips = await provider.getClips(job.providerProjectId);

  await db.update(jobs)
    .set({ status: 'ready', updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  for (const c of providerClips) {
    await db.insert(clips).values({
      id: randomUUID(),
      jobId,
      providerClipId: c.providerClipId,
      title: c.title,
      viralityScore: c.viralityScore,
      viralityScoreExplanation: c.viralityScoreExplanation,
      duration: c.duration,
      startTime: c.startTime,
      endTime: c.endTime,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log(`[Poller] Job ${jobId} completed with ${providerClips.length} clips`);
  await redis.srem(QUEUE_KEY, jobId);
};

const pollJob = async (jobId: string): Promise<void> => {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job?.providerProjectId) {
      console.log(`[Poller] Job ${jobId} has no providerProjectId, removing from queue`);
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    const status = await provider.getProjectStatus(job.providerProjectId);

    if (status === 'processing') return;

    if (status === 'failed') {
      console.error(`[Poller] Job ${jobId} failed`);
      await db.update(jobs)
        .set({ status: 'error', errorMessage: 'Provider processing failed', updatedAt: new Date() })
        .where(eq(jobs.id, jobId));
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    // status === 'completed'
    await processCompletedJob(jobId);
  } catch (error) {
    console.error(`[Poller] Error for job ${jobId}:`, error);
    // Don't remove from queue — retry next cycle
  }
};
