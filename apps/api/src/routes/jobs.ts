import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs, user, clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createVideoTask, createManagedUser, isKlapConfigured } from '../services/klap';
import { auth } from '../lib/auth';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';

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
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?!\w)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Sanitize YouTube URL - validate and normalize to standard format
 */
function sanitizeYouTubeUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  
  // Return normalized URL in standard format
  return `https://www.youtube.com/watch?v=${videoId}`;
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
    // Prepare authentication context (Better Auth)
    let dbUserId: string | null = null;
    let onBehalfOf: string | undefined = undefined;
    let userRecordKlAPid: string | null = null;

    // Attempt to read BetterAuth session and map to local user entry
    try {
      const api: any = (auth as any).api;
      if (api && typeof api.getSession === 'function') {
        const session: any = await api.getSession({ headers: request.headers as any });
        if (session?.user?.id) {
          // Load local user by BetterAuth user id
          const results = await db.select().from(user).where(eq(user.id, session.user.id));
          const found: any[] = results as any;
          if (found && found.length > 0) {
            const u = found[0];
            dbUserId = u.id;
            userRecordKlAPid = u.klapManagedUserId ?? null;
            if (userRecordKlAPid) {
              onBehalfOf = userRecordKlAPid;
            } else {
              // Try to create managed user for this local user
              try {
                const managed = await createManagedUser();
                // Persist to DB
                await db.update(user).set({ klapManagedUserId: managed.id }).where(eq(user.id, u.id));
                onBehalfOf = managed.id;
              } catch (err) {
                console.error('[Jobs] Failed to create Klap managed user for user', u.id, err);
              }
            }
          }
        }
      }
    } catch (e) {
      // Non-fatal: proceed as anonymous if auth not available
    }

    try {
      const klapTask = await createVideoTask(sanitizedUrl, onBehalfOf);
      await db.insert(jobs).values({
        id: jobId,
        userId: dbUserId,
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
      // If Klap task creation fails, still surface a pending job entry for visibility
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
  // Fetch embedUrl from first related clip if available
  const jobClips = await db.select().from(clips).where(eq(clips.jobId, params.id));
  const embedUrl = jobClips.length > 0 ? jobClips[0].embedUrl : null;
  return { id: job.id, status: job.status, youtubeUrl: job.youtubeUrl, errorMessage: job.errorMessage, embedUrl };
})
  .get('/', async ({ request, set }) => {
    // Require authentication - return only user's own jobs
    let dbUserId: string | null = null;
    
    try {
      const api: any = (auth as any).api;
      if (api && typeof api.getSession === 'function') {
        const session: any = await api.getSession({ headers: request.headers as any });
        if (session?.user?.id) {
          const results = await db.select().from(user).where(eq(user.id, session.user.id));
          const found: any[] = results as any;
          if (found && found.length > 0) {
            dbUserId = found[0].id;
          }
        }
      }
    } catch (e) {
      // Non-fatal: proceed as anonymous (will return empty)
    }

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
