import { Elysia, type Static } from 'elysia';
import { db } from '../db/client';
import { jobs, experiments, clips } from '../db/schema';
import { klapRequest, isKlapConfigured, type KlapTask } from '../services/klap';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { auth } from '../lib/auth';
import { env } from '../env';
import { CreateExperimentRequest, Configuration } from '../schemas/experiments';
import { eq, inArray } from 'drizzle-orm';

type ConfigType = Static<typeof Configuration>;
type CreateExperimentBody = Static<typeof CreateExperimentRequest>;

function buildKlapTaskBody(sourceUrl: string, config: ConfigType): Record<string, unknown> {
  const body: Record<string, unknown> = {
    source_video_url: sourceUrl,
    language: 'en',
  };
  
  if (config.max_duration) body.max_duration = config.max_duration;
  if (config.max_clip_count) body.max_clip_count = config.max_clip_count;
  if (config.editing_options) body.editing_options = config.editing_options;
  if (config.dimensions) body.dimensions = config.dimensions;
  
  return body;
}

function createVideoTaskWithConfig(sourceUrl: string, config: ConfigType): Promise<KlapTask> {
  const body = buildKlapTaskBody(sourceUrl, config);
  return klapRequest<KlapTask>('/tasks/video-to-shorts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?!\w)/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function sanitizeYouTubeUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

async function requireOwner(headers: Headers): Promise<string> {
  const api = (auth as any).api;
  if (!api || typeof api.getSession !== 'function') {
    throw new Error('Unauthorized');
  }
  
  const session = await api.getSession({ headers: headers as any });
  const userId = session?.user?.id;
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  if (userId !== env.OWNER_USER_ID) {
    throw new Error('Forbidden');
  }
  
  return userId;
}

export const experimentsRoute = new Elysia({ prefix: '/api/experiments' })
  .post('/', async ({ body, set, request }) => {
    let authenticatedUserId: string;
    try {
      authenticatedUserId = await requireOwner(request.headers);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (!isKlapConfigured()) {
      set.status = 500;
      return { error: 'Klap API not configured', message: 'KLAP_API_KEY is missing.' };
    }

    const typedBody = body as CreateExperimentBody;
    const sanitizedUrl = sanitizeYouTubeUrl(typedBody.sourceVideoUrl);
    if (!sanitizedUrl) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' };
    }
    
    const videoId = extractVideoId(typedBody.sourceVideoUrl);
    if (!videoId) {
      set.status = 400;
      return { error: 'Invalid URL', message: 'Could not extract video ID from URL' };
    }

    const experimentId = randomUUID();
    const now = new Date();

    await db.insert(experiments).values({
      id: experimentId,
      userId: authenticatedUserId,
      sourceVideoUrl: sanitizedUrl,
      sourceVideoId: videoId,
      name: typedBody.name,
      description: (typedBody as any).description ?? null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const jobIds: string[] = [];
    const errors: Array<{ configIndex: number; error: string }> = [];

    const configurations = typedBody.configurations ?? [];
    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      if (!config) continue;
      
      const jobId = randomUUID();

      try {
        const klapTask = await createVideoTaskWithConfig(sanitizedUrl, config);

        await db.insert(jobs).values({
          id: jobId,
          userId: authenticatedUserId,
          experiment_id: experimentId,
          youtubeUrl: sanitizedUrl,
          klapTaskId: klapTask.id,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });

        await enqueueJob(jobId);
        jobIds.push(jobId);
      } catch (error) {
        console.error(`[Experiments] Failed to create job for config ${i}:`, error);
        errors.push({
          configIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (jobIds.length === 0) {
      await db.update(experiments)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(experiments.id, experimentId));
      set.status = 500;
      return { 
        error: 'All jobs failed', 
        message: 'Failed to create any jobs for experiment',
        details: errors,
      };
    }

    return {
      id: experimentId,
      status: 'pending',
      jobIds,
      errors: errors.length > 0 ? errors : undefined,
    };
  }, {
    body: CreateExperimentRequest,
    detail: {
      summary: 'Create a new experiment',
      description: 'Create an experiment with multiple job configurations for A/B testing',
    },
  })
  .get('/', async ({ request, set }) => {
    let authenticatedUserId: string;
    try {
      authenticatedUserId = await requireOwner(request.headers);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const results = await db.select().from(experiments).where(eq(experiments.userId, authenticatedUserId));
    const experimentsWithStatus = await Promise.all((results as any[]).map(async (e) => {
      const relatedJobs = await db.select().from(jobs).where(eq(jobs.experiment_id, e.id));
      const jobStatuses = new Set(relatedJobs.map(j => j.status));
      let computedStatus = e.status;
      if (jobStatuses.has('error')) {
        computedStatus = 'error';
      } else if (jobStatuses.has('ready') && !jobStatuses.has('pending') && !jobStatuses.has('processing')) {
        computedStatus = 'ready';
      } else if (jobStatuses.has('processing') || jobStatuses.has('pending')) {
        computedStatus = 'processing';
      }
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        status: computedStatus,
        sourceVideoUrl: e.sourceVideoUrl,
        createdAt: e.createdAt,
      };
    }));
    return experimentsWithStatus;
  })
  .get('/:id', async ({ params, request, set }) => {
    // Authorization: ensure the request is from the owner
    try {
      await requireOwner(request.headers);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) {
      set.status = 400;
      return { error: 'Missing id' };
    }

    // Fetch experiment by ID
    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    if (!experiment) {
      set.status = 404;
      return { error: 'Experiment not found' };
    }

    // Fetch related jobs
    const relatedJobs = await db.select().from(jobs).where(eq(jobs.experiment_id, id));

    // Fetch clips for all related jobs
    const jobIds = relatedJobs.map(j => j.id);
    const relatedClips = jobIds.length > 0
      ? await db.select().from(clips).where(inArray(clips.jobId, jobIds))
      : [];

    const clipsByJobId: Record<string, Array<{id: string; name: string | null; viralityScore: number | null; previewUrl: string | null; exportStatus: string | null; exportUrl: string | null; embedUrl: string | null}>> = {};
    for (const clip of relatedClips) {
      const jId = clip.jobId;
      if (jId) {
        if (!clipsByJobId[jId]) clipsByJobId[jId] = [];
        clipsByJobId[jId]!.push({
          id: clip.id,
          name: clip.name,
          viralityScore: clip.viralityScore,
          previewUrl: clip.previewUrl,
          exportStatus: clip.exportStatus,
          exportUrl: clip.exportUrl,
          embedUrl: clip.embedUrl ?? null,
        });
      }
    }

    const jobStatuses = new Set(relatedJobs.map(j => j.status));
    let computedStatus = experiment.status;
    if (jobStatuses.has('error')) {
      computedStatus = 'error';
    } else if (jobStatuses.has('ready') && !jobStatuses.has('pending') && !jobStatuses.has('processing')) {
      computedStatus = 'ready';
    } else if (jobStatuses.has('processing') || jobStatuses.has('pending')) {
      computedStatus = 'processing';
    }

    const jobsWithClips = relatedJobs.map(job => ({
      ...job,
      clips: clipsByJobId[job.id] ?? [],
    }));

    return {
      ...experiment,
      status: computedStatus,
      jobs: jobsWithClips,
    };
  }, {
    detail: {
      summary: 'Get experiment by id with joined jobs',
      description: 'Return an experiment and its associated jobs by ID',
    },
  })
  .delete('/:id', async ({ params, set, request }) => {
    let authenticatedUserId: string;
    try {
      authenticatedUserId = await requireOwner(request.headers);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) {
      set.status = 400;
      return { error: 'Missing id' };
    }

    const existing = await db.select().from(experiments).where(eq(experiments.id, id)).execute();
    const row = Array.isArray(existing) ? existing[0] : (existing?.[0] ?? undefined);
    if (!row) {
      set.status = 404;
      return { error: 'Experiment not found' };
    }

    await db.delete(jobs).where(eq(jobs.experiment_id, id));
    await db.delete(experiments).where(eq(experiments.id, id));
    return { message: 'Experiment deleted', id };
  }, {
    detail: {
      summary: 'Delete an experiment by ID',
      description: 'Removes the experiment and all associated jobs. Protected by owner authentication.',
    },
  })
  .get('/:id/export', async ({ params, request, set }) => {
    try {
      await requireOwner(request.headers);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden') {
        set.status = 403;
        return { error: 'Forbidden' };
      }
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) {
      set.status = 400;
      return { error: 'Missing id' };
    }

    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    if (!experiment) {
      set.status = 404;
      return { error: 'Experiment not found' };
    }

    const relatedJobs = await db.select().from(jobs).where(eq(jobs.experiment_id, id));
    const jobIds = relatedJobs.map(j => j.id);
    const relatedClips = jobIds.length > 0
      ? await db.select().from(clips).where(inArray(clips.jobId, jobIds))
      : [];

    const csvEscape = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = [
      'experiment_name', 'experiment_description', 'experiment_status',
      'source_video_url', 'job_id', 'job_status', 'job_error',
      'clip_name', 'virality_score', 'virality_score_explanation', 'clip_preview_url', 'clip_export_url',
    ].map(csvEscape).join(',');

    const rows: string[] = [header];

    if (relatedJobs.length === 0) {
      rows.push([
        csvEscape(experiment.name),
        csvEscape((experiment as any).description),
        csvEscape(experiment.status),
        csvEscape(experiment.sourceVideoUrl),
        '', '', '', '', '', '', '', '',
      ].join(','));
    }

    for (const job of relatedJobs) {
      const jobClips = relatedClips.filter(c => c.jobId === job.id);
      if (jobClips.length === 0) {
        rows.push([
          csvEscape(experiment.name),
          csvEscape((experiment as any).description),
          csvEscape(experiment.status),
          csvEscape(experiment.sourceVideoUrl),
          csvEscape(job.id),
          csvEscape(job.status),
          csvEscape(job.errorMessage),
          '', '', '', '', '',
        ].join(','));
      } else {
        for (const clip of jobClips) {
          rows.push([
            csvEscape(experiment.name),
            csvEscape((experiment as any).description),
            csvEscape(experiment.status),
            csvEscape(experiment.sourceVideoUrl),
            csvEscape(job.id),
            csvEscape(job.status),
            csvEscape(job.errorMessage),
            csvEscape(clip.name),
            csvEscape(clip.viralityScore),
            csvEscape((clip as any).viralityScoreExplanation),
            csvEscape(clip.previewUrl),
            csvEscape(clip.exportUrl),
          ].join(','));
        }
      }
    }

    const csv = rows.join('\n');
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = `attachment; filename="experiment-${id}.csv"`;
    return csv;
  }, {
    detail: {
      summary: 'Export experiment as CSV',
      description: 'Export experiment data with jobs and clips as a CSV file',
    },
  });

 
