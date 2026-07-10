import { Elysia } from 'elysia';
import { db } from '../db/client';
import { jobs, user, clips } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { resolveClipUrls } from '../services/clip-resolver';
import { getProvider } from '../services/providers';

const VIDEO_FETCH_TIMEOUT_MS = 30_000;

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

/**
 * Resolve the video URL for a clip.
 * - If clip.clipUrl is stored (Reka), use it directly.
 * - Otherwise (Reap, Vizard), call provider.getClipUrls() for a live URL.
 * Returns null if the URL cannot be resolved.
 */
async function resolveVideoUrl(
  clip: typeof clips.$inferSelect,
  job: typeof jobs.$inferSelect,
): Promise<string | null> {
  if (clip.clipUrl) return clip.clipUrl;

  if (!job.providerProjectId) return null;

  try {
    const provider = getProvider(job.provider);
    const urlMap = await provider.getClipUrls(job.providerProjectId);
    return urlMap.get(clip.providerClipId) ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch a video URL with Range header passthrough.
 * If the CDN returns 403/404 (expired URL), refresh via provider and retry once.
 */
async function fetchVideoWithRefresh(
  videoUrl: string,
  job: typeof jobs.$inferSelect,
  clip: typeof clips.$inferSelect,
  rangeHeader: string | null,
): Promise<Response> {
  const fetchHeaders: HeadersInit = {};
  if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIDEO_FETCH_TIMEOUT_MS);

  try {
    let res = await fetch(videoUrl, {
      headers: fetchHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    // URL expired — refresh and retry
    if (res.status === 403 || res.status === 404) {
      if (job.providerProjectId) {
        try {
          const provider = getProvider(job.provider);
          const freshMap = await provider.getClipUrls(job.providerProjectId);
          const freshUrl = freshMap.get(clip.providerClipId);
          if (freshUrl && freshUrl !== videoUrl) {
            const retryController = new AbortController();
            const retryTimer = setTimeout(
              () => retryController.abort(),
              VIDEO_FETCH_TIMEOUT_MS,
            );
            try {
              res = await fetch(freshUrl, {
                headers: fetchHeaders,
                signal: retryController.signal,
                redirect: 'follow',
              });
            } finally {
              clearTimeout(retryTimer);
            }
          }
        } catch {
        }
      }
    }

    return res;
  } finally {
    clearTimeout(timer);
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
  })
  .get('/:jobId/stream/:clipId', async ({ params, request }) => {
    const dbUserId = await resolveUserId(request.headers);
    if (!dbUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, params.jobId));
    if (!job || job.userId !== dbUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden', message: 'You do not have access to this job' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }

    const [clip] = await db
      .select()
      .from(clips)
      .where(and(eq(clips.id, params.clipId), eq(clips.jobId, params.jobId)));

    if (!clip) {
      return new Response(JSON.stringify({ error: 'Not Found', message: 'Clip not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const videoUrl = await resolveVideoUrl(clip, job);
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Bad Gateway', message: 'Unable to resolve clip URL' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    const rangeHeader = request.headers.get('range');
    const upstream = await fetchVideoWithRefresh(
      videoUrl,
      job,
      clip,
      rangeHeader,
    );

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(JSON.stringify({ error: 'Bad Gateway', message: 'Upstream video fetch failed' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    const headers = new Headers(upstream.headers);
    headers.set('content-disposition', 'inline');
    headers.set('accept-ranges', 'bytes');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  });
