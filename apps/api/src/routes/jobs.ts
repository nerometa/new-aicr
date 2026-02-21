import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createVideoTask, isKlapConfigured } from '../services/klap';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}$/;

// Constants
const RATE_LIMIT_JOBS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_SEC = 3600; // 1 hour

// Job status values: pending -> processing -> ready | error
// "ready" is Klap's term (not "done")

/**
 * Check rate limit for an IP address
 * Returns true if rate limit exceeded
 */
async function isRateLimited(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    // First request, set expiry
    await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
  }
  
  return count > RATE_LIMIT_JOBS_PER_HOUR;
}

/**
 * Sanitize YouTube URL - validate and normalize
 */
function sanitizeYouTubeUrl(url: string): string | null {
  if (!YOUTUBE_URL_REGEX.test(url)) return null;
  
  try {
    // Parse and normalize the URL
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.toString();
  } catch {
    return null;
  }
}

export const jobsRoute = new Elysia({ prefix: '/api/jobs' })
  .post('/', async ({ body, set, request }) => {
    if (!isKlapConfigured()) {
      set.status = 500;
      return { error: 'Klap API not configured', message: 'KLAP_API_KEY is missing.' };
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (await isRateLimited(ip)) {
      set.status = 429;
      return { error: 'Rate limit exceeded', message: `Maximum ${RATE_LIMIT_JOBS_PER_HOUR} jobs per hour allowed.` };
    }

    // Sanitize URL
    const sanitizedUrl = sanitizeYouTubeUrl(body.youtubeUrl);
    if (!sanitizedUrl) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' };
    }
    
    const jobId = randomUUID();
    
    try {
      const klapTask = await createVideoTask(sanitizedUrl);
      
      await db.insert(jobs).values({
        id: jobId,
        userId: null, // Anonymous jobs - no FK constraint
        youtubeUrl: sanitizedUrl,
        klapTaskId: klapTask.id,
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
      return { error: 'Failed to create job', message: error instanceof Error ? error.message : 'Unknown error' };
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
    return { id: job.id, status: job.status, youtubeUrl: job.youtubeUrl, errorMessage: job.errorMessage };
  })
  .get('/', async () => {
    const allJobs = await db.select().from(jobs);
    return allJobs.map(j => ({ id: j.id, status: j.status, youtubeUrl: j.youtubeUrl }));
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
      try {
        // Controller might already be closed by client disconnect
      } catch {
        // Ignore - controller already closed
      }
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
            // Klap uses "ready" not "done"
            if (job?.status === 'ready' || job?.status === 'error') {
              safeClose();
            }
          } catch {
            safeClose();
          }
        }, 5000);

        // Cleanup on abort (client disconnect)
        signal?.addEventListener('abort', safeClose);
      },
    });

    return new Response(stream);
  });
