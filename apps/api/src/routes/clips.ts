import { Elysia } from 'elysia';
import { db } from '../db/client';
import { jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { resolveClipUrls } from '../services/clip-resolver';

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

export const clipsRoute = new Elysia({ prefix: '/api/clips' })
  .get('/:jobId', async ({ params, request, set }) => {
    const dbUserId = await resolveUserId(request.headers);
    if (!dbUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Authentication required' };
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
    if (!job || job.userId !== dbUserId) {
      set.status = 403;
      return { error: 'Forbidden', message: 'You do not have access to this job' };
    }

    // Use ClipResolver to get clips with resolved URLs
    const clips = await resolveClipUrls(params.jobId);

    // Map to response shape
    return clips.map(c => ({
      id: c.id,
      jobId: c.jobId,
      title: c.title,
      viralityScore: c.viralityScore,
      duration: c.duration,
      startTime: c.startTime,
      endTime: c.endTime,
      // clipUrl is null when project expired or provider unreachable
      clipUrl: c.clipUrl,
      // urlExpired flag signals frontend that URL is unavailable due to expiry
      urlExpired: c.urlExpired,
    }));
  });
