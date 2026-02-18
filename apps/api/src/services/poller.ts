import { Redis } from '@upstash/redis';
import { db } from '../db/client';
import { jobs, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTask, getProjects, previewUrl } from './klap';
import type { KlapProject, KlapTask } from './klap';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});
const QUEUE_KEY = 'aicr:polling_jobs';

export const enqueueJob = (jobId: string) => redis.sadd(QUEUE_KEY, jobId);

export const startPoller = () => {
  setInterval(async () => {
    const jobIds: string[] = await redis.smembers(QUEUE_KEY);
    for (const jobId of jobIds) {
      await pollJob(jobId);
    }
  }, 30_000);
};

const pollJob = async (jobId: string) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job?.klapTaskId) return;

  const task: KlapTask = await getTask(job.klapTaskId);

  if (task.status === 'processing') return;

  if (task.status === 'error') {
    await db.update(jobs).set({ status: 'error', errorMessage: 'Klap processing failed' }).where(eq(jobs.id, jobId));
    await redis.srem(QUEUE_KEY, jobId);
    return;
  }

  const folderId = task.output_id;
  if (!folderId) return;
  
  const projects: KlapProject[] = await getProjects(folderId);

  await db.update(jobs).set({ status: 'done', klapFolderId: folderId, updatedAt: new Date() }).where(eq(jobs.id, jobId));

  for (const p of projects) {
    await db.insert(clips).values({
      id: p.id,
      jobId,
      klapFolderId: folderId,
      name: p.name,
      viralityScore: p.virality_score,
      previewUrl: previewUrl(p.id),
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  await redis.srem(QUEUE_KEY, jobId);
};
