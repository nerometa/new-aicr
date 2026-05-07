import { redis } from '../lib/redis';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider } from './providers';
import { completeJob, failJob } from './completion';

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

const pollJob = async (jobId: string): Promise<void> => {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job?.providerProjectId) {
      console.log(`[Poller] Job ${jobId} has no providerProjectId, removing from queue`);
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    const provider = getProvider(job.provider);
    const status = await provider.getProjectStatus(job.providerProjectId);

    if (status === 'processing') return;

    if (status === 'failed') {
      console.error(`[Poller] Job ${jobId} failed`);
      await failJob(jobId, 'Provider processing failed');
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    // status === 'completed'
    await completeJob(jobId);
    await redis.srem(QUEUE_KEY, jobId);
  } catch (error) {
    console.error(`[Poller] Error for job ${jobId}:`, error);
    // Don't remove from queue — retry next cycle
  }
};
