import { Elysia } from 'elysia';
import { db } from '../db/client';
import { clips, jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { provider } from '../services/providers';

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

    const jobClips = await db.select().from(clips).where(eq(clips.jobId, params.jobId));
    if (jobClips.length === 0) {
      return [];
    }

    // Fetch live URLs from provider. Fails gracefully if project expired.
    let urlMap = new Map<string, string>();
    if (job.providerProjectId) {
      try {
        urlMap = await provider.getClipUrls(job.providerProjectId);
      } catch (err) {
        console.error(`[Clips] Failed to fetch clip URLs for job ${params.jobId}:`, err);
        // Return metadata without URLs rather than erroring — project may be expired
      }
    }

    return jobClips.map(c => ({
      id: c.id,
      jobId: c.jobId,
      title: c.title,
      viralityScore: c.viralityScore,
      duration: c.duration,
      startTime: c.startTime,
      endTime: c.endTime,
      // null when project expired or provider unreachable
      clipUrl: urlMap.get(c.providerClipId) ?? null,
    }));
  });
