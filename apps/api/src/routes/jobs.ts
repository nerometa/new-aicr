import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createVideoTask, isKlapConfigured } from '../services/klap';
import type { KlapTask } from '../services/klap';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';

export const jobsRoute = new Elysia({ prefix: '/api/jobs' })
  .post('/', async ({ body, set }) => {
    // Check if Klap is configured
    if (!isKlapConfigured()) {
      set.status = 500;
      return { 
        error: 'Klap API not configured', 
        message: 'KLAP_API_KEY is missing. Please configure your .env file.' 
      };
    }
    
    const jobId = randomUUID();
    
    try {
      const klapTask: KlapTask = await createVideoTask(body.youtubeUrl);
      
      await db.insert(jobs).values({
        id: jobId,
        userId: 'anonymous', // TODO: Get from auth session
        youtubeUrl: body.youtubeUrl,
        klapTaskId: klapTask.id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await enqueueJob(jobId);

      return { id: jobId, status: 'pending', youtubeUrl: body.youtubeUrl };
    } catch (e: any) {
      console.error('Job creation error:', e);
      set.status = 500;
      return { 
        error: 'Failed to create job', 
        message: e.message || 'Unknown error occurred' 
      };
    }
  }, {
    body: t.Object({
      youtubeUrl: t.String(),
    }),
  })
  .get('/:id', async ({ params }) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
    if (!job) return { error: 'Job not found' };
    return {
      id: job.id,
      status: job.status,
      youtubeUrl: job.youtubeUrl,
      errorMessage: job.errorMessage,
    };
  })
  .get('/', async () => {
    const allJobs = await db.select().from(jobs);
    return allJobs.map(j => ({
      id: j.id,
      status: j.status,
      youtubeUrl: j.youtubeUrl,
    }));
  })
  .get('/sse/:jobId', ({ params, set }) => {
    set.headers['Content-Type'] = 'text/event-stream';
    set.headers['Cache-Control'] = 'no-cache';

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

        const interval = setInterval(async () => {
          const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
          send({ status: job?.status, jobId: params.jobId });
          if (job?.status === 'done' || job?.status === 'error') {
            clearInterval(interval);
            controller.close();
          }
        }, 5000);
      }
    });

    return new Response(stream);
  });
