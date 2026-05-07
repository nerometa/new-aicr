import { Elysia } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider } from '../services/providers';
import { completeJob, failJob } from '../services/completion';
import { redis } from '../lib/redis';

const QUEUE_KEY = 'aicr:polling_jobs';

interface ReapWebhookPayload {
  projectId: string;
  projectType: string;
  source: string;
  status: string;
}

// Reap-only webhook endpoint. Reka has no webhook support — poller handles it.
export const webhooksRoute = new Elysia({ prefix: '/api/webhooks' })
  .post('/reap', async ({ body, set }) => {
    // Return 200 immediately — Reap requires empty body within 10s.
    // Heavy work runs after response (fire-and-forget with error logging).
    const payload = body as ReapWebhookPayload;

    if (!payload?.projectId) {
      set.status = 400;
      return '';
    }

    handleReapEvent(payload).catch(err =>
      console.error('[Webhook] Unhandled error:', err),
    );

    set.status = 200;
    return '';
  });

async function handleReapEvent(payload: ReapWebhookPayload): Promise<void> {
  const { projectId } = payload;

  // Find job by providerProjectId — must be a Reap job
  const [job] = await db.select().from(jobs).where(eq(jobs.providerProjectId, projectId));
  if (!job) {
    console.warn(`[Webhook] No job found for providerProjectId=${projectId}`);
    return;
  }

  if (job.provider !== 'reap') {
    console.warn(`[Webhook] Received Reap webhook for non-Reap job ${job.id} (provider=${job.provider})`);
    return;
  }

  // Already terminal — skip
  if (job.status === 'ready' || job.status === 'error') {
    return;
  }

  // Re-verify status from provider — never trust payload blindly.
  let verifiedStatus: 'processing' | 'completed' | 'failed';
  try {
    const provider = getProvider(job.provider);
    verifiedStatus = await provider.getProjectStatus(projectId);
  } catch (err) {
    console.error(`[Webhook] Failed to verify status for job ${job.id}:`, err);
    return;
  }

  if (verifiedStatus === 'processing') {
    return;
  }

  if (verifiedStatus === 'failed') {
    await failJob(job.id, 'Provider processing failed');
    await redis.srem(QUEUE_KEY, job.id);
    console.log(`[Webhook] Job ${job.id} marked failed`);
    return;
  }

  // verifiedStatus === 'completed'
  await completeJob(job.id);
  await redis.srem(QUEUE_KEY, job.id);
  console.log(`[Webhook] Job ${job.id} processed via webhook`);
}
