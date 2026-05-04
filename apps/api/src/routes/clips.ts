import { Elysia } from 'elysia';
import { db } from '../db/client';
import { clips, jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';

export const clipsRoute = new Elysia({ prefix: '/api/clips' })
  .get('/:jobId', async ({ params, request, set }) => {
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
    }

    if (!dbUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
    if (!job || job.userId !== dbUserId) {
      set.status = 403;
      return { error: 'Forbidden', message: 'You do not have access to this job' };
    }

    const jobClips = await db.select().from(clips).where(eq(clips.jobId, params.jobId));
    return jobClips.map(c => ({
      id: c.id,
      jobId: c.jobId,
      name: c.name,
      viralityScore: c.viralityScore,
      previewUrl: c.previewUrl,
      exportStatus: c.exportStatus,
      exportUrl: c.exportUrl,
      embedUrl: c.embedUrl ?? null,
    }));
  });
