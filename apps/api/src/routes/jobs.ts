import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { provider } from '../services/providers';
import { auth } from '../lib/auth';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';
import { sanitizeYouTubeUrl } from '../lib/youtube';

// Constants
const RATE_LIMIT_JOBS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_SEC = 3600;

// Job status: pending -> processing -> ready | error

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
  return count > RATE_LIMIT_JOBS_PER_HOUR;
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
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (await isRateLimited(ip)) {
      set.status = 429;
      return {
        error: 'Rate limit exceeded',
        message: `Maximum ${RATE_LIMIT_JOBS_PER_HOUR} jobs per hour allowed.`,
      };
    }

    const sanitizedUrl = sanitizeYouTubeUrl(body.youtubeUrl);
    if (!sanitizedUrl) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' };
    }

    const dbUserId = await resolveUserId(request.headers);
    const jobId = randomUUID();

    try {
      const providerProjectId = await provider.createProject(sanitizedUrl);

      await db.insert(jobs).values({
        id: jobId,
        userId: dbUserId,
        youtubeUrl: sanitizedUrl,
        providerProjectId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await enqueueJob(jobId);
      console.log(`[Jobs] Created job ${jobId} for ${sanitizedUrl}`);
      return { id: jobId, status: 'pending', youtubeUrl: sanitizedUrl };
    } catch (error) {
      console.error('Job creation error:', error);
      set.status = 500;
      return {
        error: 'Failed to create job',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({ youtubeUrl: t.String() }),
  })

  .get('/:id', async ({ params, set }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!job) {
      set.status = 404;
      return { error: 'Job not found' };
    }
    return {
      id: job.id,
      status: job.status,
      youtubeUrl: job.youtubeUrl,
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
    return userJobs.map(j => ({ id: j.id, status: j.status, youtubeUrl: j.youtubeUrl }));
  })

  .get('/sse/:jobId', ({ params, set, signal }) => {
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
