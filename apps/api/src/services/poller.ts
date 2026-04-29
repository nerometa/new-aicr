import { redis } from '../lib/redis';
import { db } from '../db/client';
import { jobs, clips, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getTask, getProjects, previewUrl, generateAccessToken, embedUrl } from './klap';
import type { KlapProject, KlapTask } from './klap';

// Constants
const QUEUE_KEY = 'aicr:polling_jobs';
const POLL_INTERVAL_MS = 30_000; // Poll Klap every 30 seconds

export const enqueueJob = (jobId: string) => redis.sadd(QUEUE_KEY, jobId);

export const startPoller = () => {
  setInterval(async () => {
    const jobIds: string[] = await redis.smembers(QUEUE_KEY);
    for (const jobId of jobIds) {
      await pollJob(jobId);
    }
  }, POLL_INTERVAL_MS);
};

const pollJob = async (jobId: string) => {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job?.klapTaskId) {
      console.log(`[Poller] Job ${jobId} has no klapTaskId, removing from queue`);
      await redis.srem(QUEUE_KEY, jobId);
      return;
    }

    const task: KlapTask = await getTask(job.klapTaskId);

    // Klap status: "processing" | "ready" | "error"
    if (task.status === 'processing') return;

    if (task.status === 'error') {
      console.error(`[Poller] Job ${jobId} failed: ${task.error}`);
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
      console.error(`[Poller] Job ${jobId} has no folderId`);
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

    // Prepare optional access token for embedding clips (authenticated jobs only)
    let accessToken: string | null = null;
    try {
      if (job.userId) {
        const [u] = await db.select().from(user).where(eq(user.id, job.userId));
        const klapManagedUserId = (u as any)?.klapManagedUserId;
        if (klapManagedUserId) {
          const token: any = await generateAccessToken(klapManagedUserId);
          accessToken = token?.external_access_token ?? null;
        }
      }
    } catch (err) {
      console.error('[Poller] Failed to generate embed access token:', err);
      accessToken = null;
    }

    for (const p of projects) {
      const embed = accessToken ? embedUrl(p.id, accessToken) : null;
      await db.insert(clips).values({
        id: p.id,
        jobId,
        klapFolderId: folderId,
        name: p.name,
        viralityScore: p.virality_score,
        viralityScoreExplanation: p.virality_score_explanation,
        previewUrl: previewUrl(p.id),
        embedUrl: embed,
        createdAt: new Date(),
      }).onConflictDoNothing();
    }

    console.log(`[Poller] Job ${jobId} completed with ${projects.length} clips`);
    await redis.srem(QUEUE_KEY, jobId);
  } catch (error) {
    console.error(`[Poller] Error for job ${jobId}:`, error);
    await redis.srem(QUEUE_KEY, jobId);
  }
};
