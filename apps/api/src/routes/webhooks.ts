import { Elysia } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { provider } from '../services/providers';
import { processCompletedJob } from '../services/poller';
import { redis } from '../lib/redis';

const QUEUE_KEY = 'aicr:polling_jobs';

interface ReapWebhookPayload {
  projectId: string;
  projectType: string;
  source: string;
  status: string;
}

export const webhooksRoute = new Elysia({ prefix: '/api/webhooks' })
  .post('/reap', async ({ body, set }) => {
    // Return 200 immediately — Reap requires empty body within 10s.
    // Heavy work runs after response (fire-and-forget with error logging).
    const payload = body as ReapWebhookPayload;

    if (!payload?.projectId) {
      set.status = 400;
      return '';
    }

    // Don't await — process async so response returns immediately.
    handleReapEvent(payload).catch(err =>
      console.error('[Webhook] Unhandled error:', err),
    );

    set.status = 200;
    return '';
  });

async function handleReapEvent(payload: ReapWebhookPayload): Promise<void> {
  const { projectId, status: reportedStatus } = payload;

  // Find job by providerProjectId
  const [job] = await db.select().from(jobs).where(eq(jobs.providerProjectId, projectId));
  if (!job) {
    console.warn(`[Webhook] No job found for providerProjectId=${projectId}`);
    return;
  }

  // Already terminal — skip
  if (job.status === 'ready' || job.status === 'error') {
    return;
  }

  // Re-verify status from provider — never trust payload blindly.
  let verifiedStatus: 'processing' | 'completed' | 'failed';
  try {
    verifiedStatus = await provider.getProjectStatus(projectId);
  } catch (err) {
    console.error(`[Webhook] Failed to verify status for job ${job.id}:`, err);
    return;
  }

  if (verifiedStatus === 'processing') {
    // Provider says still processing — payload was premature or stale. Ignore.
    return;
  }

  if (verifiedStatus === 'failed') {
    await db.update(jobs)
      .set({ status: 'error', errorMessage: 'Provider processing failed', updatedAt: new Date() })
      .where(eq(jobs.id, job.id));
    await redis.srem(QUEUE_KEY, job.id);
    console.log(`[Webhook] Job ${job.id} marked failed`);
    return;
  }

  // verifiedStatus === 'completed'
  await processCompletedJob(job.id);
  console.log(`[Webhook] Job ${job.id} processed via webhook`);
}
