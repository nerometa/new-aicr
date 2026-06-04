import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getProvider, PROVIDER_NAMES } from '../services/providers';
import { auth } from '../lib/auth';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';
import { sanitizeYouTubeUrl } from '../lib/youtube';
import { env } from '../env';

// Constants
const RATE_LIMIT_JOBS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_SEC = 3600;
// Global anon bucket when no trusted proxy is configured — prevents unbounded XFF spoofing.
const RATE_LIMIT_ANON_GLOBAL_PER_HOUR = 60;

async function isRateLimited(bucket: string, limit: number): Promise<boolean> {
  const key = `rate_limit:${bucket}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
  return count > limit;
}

/**
 * Pick a rate-limit bucket key.
 *   - Authenticated request → per-user (most reliable, immune to header spoofing)
 *   - TRUST_PROXY=true → leftmost public IP from X-Forwarded-For
 *   - otherwise → single global anon bucket with tighter total cap
 * Returns [bucket, limit].
 */
function pickRateLimitBucket(headers: Headers, userId: string | null): [string, number] {
  if (userId) return [`user:${userId}`, RATE_LIMIT_JOBS_PER_HOUR];

  if (env.TRUST_PROXY) {
    const xff = headers.get('x-forwarded-for');
    if (xff) {
      // Leftmost entry is original client per RFC 7239. Validate format minimally.
      const first = xff.split(',')[0]?.trim();
      if (first && /^[\w.:%-]+$/.test(first) && first.length <= 64) {
        return [`ip:${first}`, RATE_LIMIT_JOBS_PER_HOUR];
      }
    }
    const real = headers.get('x-real-ip')?.trim();
    if (real && /^[\w.:%-]+$/.test(real) && real.length <= 64) {
      return [`ip:${real}`, RATE_LIMIT_JOBS_PER_HOUR];
    }
  }

  // Untrusted environment: collapse anonymous traffic into one bucket.
  // Trade-off: legitimate anon users share quota, but spoofing the bucket is impossible.
  return ['anon:global', RATE_LIMIT_ANON_GLOBAL_PER_HOUR];
}

async function resolveUserId(headers: Headers): Promise<string | null> {
  try {
    const api: any = (auth as any).api;
    if (!api || typeof api.getSession !== 'function') return null;
    const session: any = await api.getSession({ headers: headers as any });
    if (!session?.user?.id) return null;
    const [found] = await db.select().from(user).where(eq(user.id, session.user.id));
    return found?.id ?? null;
  } catch {
    return null;
  }
}

export const jobsRoute = new Elysia({ prefix: '/api/jobs' })
  .post('/', async ({ body, set, request }) => {
    // Resolve user first → enables per-user bucket (immune to header spoofing).
    const dbUserId = await resolveUserId(request.headers);

    const [bucket, limit] = pickRateLimitBucket(request.headers, dbUserId);
    if (await isRateLimited(bucket, limit)) {
      set.status = 429;
      return {
        error: 'Rate limit exceeded',
        message: `Maximum ${limit} jobs per hour allowed.`,
      };
    }

    const sanitizedUrl = sanitizeYouTubeUrl(body.youtubeUrl);
    if (!sanitizedUrl) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' };
    }

    const providerName = body.provider ?? 'reap';

    // Validate against registry — fast-fail before any provider call
    if (!PROVIDER_NAMES.includes(providerName as any)) {
      set.status = 400;
      return {
        error: 'Invalid provider',
        message: `Unknown provider "${providerName}". Valid options: ${PROVIDER_NAMES.join(', ')}`,
      };
    }

    const jobId = randomUUID();

    try {
      const provider = getProvider(providerName);
      const providerProjectId = await provider.createProject(sanitizedUrl);

      await db.insert(jobs).values({
        id: jobId,
        userId: dbUserId,
        youtubeUrl: sanitizedUrl,
        provider: providerName,
        providerProjectId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await enqueueJob(jobId);
      console.log(`[Jobs] Created job ${jobId} via ${providerName} for ${sanitizedUrl}`);
      return { id: jobId, status: 'pending', youtubeUrl: sanitizedUrl, provider: providerName };
    } catch (error) {
      // Generate correlation id; log full error server-side; return opaque message.
      const correlationId = randomUUID();
      console.error(`[Jobs] Job creation error [${correlationId}]:`, error);
      set.status = 500;
      return {
        error: 'Failed to create job',
        message: 'Upstream provider error. Try again later.',
        correlationId,
      };
    }
  }, {
    body: t.Object({
      youtubeUrl: t.String(),
      provider: t.Optional(t.Union([t.Literal('reap'), t.Literal('reka')])),
    }),
  })

  .get('/:id', async ({ params, request, set }) => {
    const dbUserId = await resolveUserId(request.headers);
    if (!dbUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!job) {
      set.status = 404;
      return { error: 'Job not found' };
    }
    if (job.userId !== dbUserId) {
      set.status = 403;
      return { error: 'Forbidden', message: 'You do not have access to this job' };
    }
    return {
      id: job.id,
      status: job.status,
      youtubeUrl: job.youtubeUrl,
      provider: job.provider,
      errorMessage: job.errorMessage,
    };
  })

  .get('/', async ({ request, set }) => {
    const dbUserId = await resolveUserId(request.headers);
    if (!dbUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required to view jobs' };
    }
    const userJobs = await db.select().from(jobs).where(eq(jobs.userId, dbUserId));
    return userJobs.map(j => ({ id: j.id, status: j.status, youtubeUrl: j.youtubeUrl, provider: j.provider }));
  })

  .get('/sse/:jobId', async ({ params, request, set, signal }) => {
    // Auth + ownership check BEFORE opening stream
    const dbUserId = await resolveUserId(request.headers);
    if (!dbUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }
    const [ownedJob] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
    if (!ownedJob) {
      set.status = 404;
      return { error: 'Job not found' };
    }
    if (ownedJob.userId !== dbUserId) {
      set.status = 403;
      return { error: 'Forbidden', message: 'You do not have access to this job' };
    }

    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';
    set.headers['Connection'] = 'keep-alive';

    let closed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const safeClose = () => {
      if (closed) return;
      closed = true;
      if (intervalId) clearInterval(intervalId);
    };

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          if (closed) return;
          try {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          } catch {
            safeClose();
          }
        };

        intervalId = setInterval(async () => {
          if (closed) {
            if (intervalId) clearInterval(intervalId);
            return;
          }
          try {
            const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
            send({ status: job?.status, jobId: params.jobId });
            if (job?.status === 'ready' || job?.status === 'error') safeClose();
          } catch {
            safeClose();
          }
        }, 5000);

        signal?.addEventListener('abort', safeClose);
      },
    });

    return new Response(stream);
  });
