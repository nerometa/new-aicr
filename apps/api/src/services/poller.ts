import { redis } from '../lib/redis';
import { db } from '../db/client';
import { jobs, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTask, getProjects, previewUrl } from './klap';
import type { KlapProject, KlapTask } from './klap';

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
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job?.klapTaskId) {
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    const task: KlapTask = await getTask(job.klapTaskId);

    // Klap status: "processing" | "ready" | "error"
    if (task.status === 'processing') return;

    if (task.status === 'error') {
      await db.update(jobs).set({ 
        status: 'error', 
        errorMessage: task.error || 'Klap processing failed' 
      }).where(eq(jobs.id, jobId));
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    // task.status === 'ready'
    const folderId = task.output_id;
    if (!folderId) {
      console.error(`pollJob: No folderId for ready job ${jobId}`);
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }
    
    const projects: KlapProject[] = await getProjects(folderId);

    // Use 'ready' to match Klap API terminology
    await db.update(jobs).set({ 
      status: 'ready', 
      klapFolderId: folderId, 
      updatedAt: new Date() 
    }).where(eq(jobs.id, jobId));

    for (const p of projects) {
      await db.insert(clips).values({
        id: p.id,
        jobId,
        klapFolderId: folderId,
        name: p.name,
        viralityScore: p.virality_score,
        viralityScoreExplanation: p.virality_score_explanation,
        previewUrl: previewUrl(p.id),
        createdAt: new Date(),
      }).onConflictDoNothing();
    }

    await redis.srem(QUEUE_KEY, jobId);
  } catch (error) {
    console.error(`pollJob error for ${jobId}:`, error);
    await redis.srem(QUEUE_KEY, jobId);
  }
};
