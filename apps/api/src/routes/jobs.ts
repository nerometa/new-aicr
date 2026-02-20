import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createVideoTask, isKlapConfigured } from '../services/klap';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}$/;

// Job status values: pending -> processing -> ready | error
// "ready" is Klap's term (not "done")

export const jobsRoute = new Elysia({ prefix: '/api/jobs' })
  .post('/', async ({ body, set }) => {
    if (!isKlapConfigured()) {
      set.status = 500;
      return { error: 'Klap API not configured', message: 'KLAP_API_KEY is missing.' };
    }

    if (!YOUTUBE_URL_REGEX.test(body.youtubeUrl)) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' };
    }
    
    const jobId = randomUUID();
    
    try {
      const klapTask = await createVideoTask(body.youtubeUrl);
      
      await db.insert(jobs).values({
        id: jobId,
        userId: null, // Anonymous jobs - no FK constraint
        youtubeUrl: body.youtubeUrl,
        klapTaskId: klapTask.id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await enqueueJob(jobId);
      return { id: jobId, status: 'pending', youtubeUrl: body.youtubeUrl };
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

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

        const intervalId = setInterval(async () => {
          try {
            const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
            send({ status: job?.status, jobId: params.jobId });
            // Klap uses "ready" not "done"
            if (job?.status === 'ready' || job?.status === 'error') {
              clearInterval(intervalId);
              controller.close();
            }
          } catch {
            clearInterval(intervalId);
            controller.close();
          }
        }, 5000);

        // Cleanup on abort (client disconnect)
        signal?.addEventListener('abort', () => {
          clearInterval(intervalId);
          controller.close();
        });
      },
    });

    return new Response(stream);
  });
