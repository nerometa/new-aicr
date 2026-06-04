import { Elysia } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider } from '../services/providers';
import { completeJob, failJob } from '../services/completion';
import { redis } from '../lib/redis';
import { env } from '../env';
import { createHmac, timingSafeEqual } from 'node:crypto';

const QUEUE_KEY = 'aicr:polling_jobs';

interface ReapWebhookPayload {
  projectId: string;
  projectType: string;
  source: string;
  status: string;
}

/**
 * Verify webhook authenticity against REAP_WEBHOOK_SECRET. Accepts (in priority order):
 *   1. X-Reap-Signature: hex HMAC-SHA256(rawBody, secret)   ← preferred if Reap signs
 *   2. Authorization: Bearer <secret>                       ← if proxy/Reap supports custom header
 *   3. ?token=<secret> query parameter                      ← last-resort fallback
 * All comparisons are timing-safe. Returns false on any failure.
 */
function verifyWebhookAuth(rawBody: string, request: Request): boolean {
  const secret = env.REAP_WEBHOOK_SECRET;

  // 1. HMAC signature header
  const sigHeader = request.headers.get('x-reap-signature');
  if (sigHeader) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const got = sigHeader.replace(/^sha256=/i, '').trim();
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(got, 'hex');
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // fallthrough — malformed hex
    }
  }

  // 2. Bearer authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }

  // 3. Query token (URL is HTTPS, but secret will appear in logs — only enable as fallback)
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (token) {
      const a = Buffer.from(token);
      const b = Buffer.from(secret);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  } catch {
    // malformed URL — ignore
  }

  return false;
}

// Reap-only webhook endpoint. Reka has no webhook support — poller handles it.
export const webhooksRoute = new Elysia({ prefix: '/api/webhooks' })
  .post('/reap', async ({ request, set }) => {
    // Read raw body — required for HMAC verification (consumes request stream).
    const rawBody = await request.text();

    if (!verifyWebhookAuth(rawBody, request)) {
      set.status = 401;
      return '';
    }

    let payload: ReapWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as ReapWebhookPayload;
    } catch {
      set.status = 400;
      return '';
    }

    if (!payload?.projectId || typeof payload.projectId !== 'string') {
      set.status = 400;
      return '';
    }

    // Return 200 immediately — Reap requires empty body within 10s.
    // Heavy work runs after response (fire-and-forget with error logging).
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
