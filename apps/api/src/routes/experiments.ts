import { Elysia, type Static } from 'elysia';
import { db } from '../db/client';
import { jobs, experiments, clips } from '../db/schema';
import { provider } from '../services/providers';
import type { ClipConfig } from '../services/providers';
import { enqueueJob } from '../services/poller';
import { randomUUID } from 'crypto';
import { auth } from '../lib/auth';
import { env } from '../env';
import { CreateExperimentRequest, Configuration } from '../schemas/experiments';
import { eq, inArray } from 'drizzle-orm';
import { extractVideoId, sanitizeYouTubeUrl } from '../lib/youtube';

type ConfigType = Static<typeof Configuration>;
type CreateExperimentBody = Static<typeof CreateExperimentRequest>;

function toClipConfig(config: ConfigType): ClipConfig {
  return {
    clipDuration: config.clipDuration,
    orientation: config.orientation,
    captions: config.captions,
    emojis: config.emojis,
  };
}

// Auto-name an experiment config for display (e.g. "dur-30-portrait-caps")
function configLabel(config: ConfigType): string {
  const parts: string[] = [];
  if (config.clipDuration) parts.push(`dur-${config.clipDuration}`);
  if (config.orientation) parts.push(config.orientation);
  if (config.captions !== undefined) parts.push(config.captions ? 'caps' : 'no-caps');
  if (config.emojis !== undefined) parts.push(config.emojis ? 'emojis' : 'no-emojis');
  return parts.join('-') || 'default';
}

async function requireOwner(headers: Headers): Promise<string> {
  const api = (auth as any).api;
  if (!api || typeof api.getSession !== 'function') throw new Error('Unauthorized');
  const session = await api.getSession({ headers: headers as any });
  const userId = session?.user?.id;
  if (!userId) throw new Error('Unauthorized');
  if (userId !== env.OWNER_USER_ID) throw new Error('Forbidden');
  return userId;
}

function authGuard(error: unknown): { status: number; body: object } {
  if (error instanceof Error && error.message === 'Forbidden') {
    return { status: 403, body: { error: 'Forbidden' } };
  }
  return { status: 401, body: { error: 'Unauthorized' } };
}

function deriveExperimentStatus(jobStatuses: Set<string>): string {
  const all = [...jobStatuses];
  if (all.every(s => s === 'error')) return 'error';
  if (all.every(s => s === 'ready')) return 'ready';
  if (all.some(s => s === 'error') && all.some(s => s === 'ready')) return 'partial';
  if (all.some(s => s === 'processing' || s === 'pending')) return 'processing';
  return 'pending';
}

export const experimentsRoute = new Elysia({ prefix: '/api/experiments' })
  .post('/', async ({ body, set, request }) => {
    let authenticatedUserId: string;
    try {
      authenticatedUserId = await requireOwner(request.headers);
    } catch (error) {
      const { status, body: errBody } = authGuard(error);
      set.status = status;
      return errBody;
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
      description: typedBody.description ?? null,
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
        const clipConfig = toClipConfig(config);
        const providerProjectId = await provider.createProject(sanitizedUrl, clipConfig);

        await db.insert(jobs).values({
          id: jobId,
          userId: authenticatedUserId,
          experimentId,
          youtubeUrl: sanitizedUrl,
          providerProjectId,
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
      const { status, body } = authGuard(error);
      set.status = status;
      return body;
    }

    const results = await db.select().from(experiments).where(eq(experiments.userId, authenticatedUserId));

    return Promise.all(results.map(async (e) => {
      const relatedJobs = await db.select().from(jobs).where(eq(jobs.experimentId, e.id));
      const computedStatus = deriveExperimentStatus(new Set(relatedJobs.map(j => j.status)));
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        status: computedStatus,
        sourceVideoUrl: e.sourceVideoUrl,
        createdAt: e.createdAt,
      };
    }));
  })

  .get('/:id', async ({ params, request, set }) => {
    try {
      await requireOwner(request.headers);
    } catch (error) {
      const { status, body } = authGuard(error);
      set.status = status;
      return body;
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) { set.status = 400; return { error: 'Missing id' }; }

    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    if (!experiment) { set.status = 404; return { error: 'Experiment not found' }; }

    const relatedJobs = await db.select().from(jobs).where(eq(jobs.experimentId, id));
    const jobIds = relatedJobs.map(j => j.id);
    const relatedClips = jobIds.length > 0
      ? await db.select().from(clips).where(inArray(clips.jobId, jobIds))
      : [];

    const clipsByJobId: Record<string, typeof relatedClips> = {};
    for (const clip of relatedClips) {
      if (clip.jobId) {
        if (!clipsByJobId[clip.jobId]) clipsByJobId[clip.jobId] = [];
        clipsByJobId[clip.jobId]!.push(clip);
      }
    }

    const computedStatus = deriveExperimentStatus(new Set(relatedJobs.map(j => j.status)));

    const jobsWithClips = relatedJobs.map(job => ({
      id: job.id,
      status: job.status,
      errorMessage: job.errorMessage,
      clips: (clipsByJobId[job.id] ?? []).map(c => ({
        id: c.id,
        title: c.title,
        viralityScore: c.viralityScore,
        viralityScoreExplanation: c.viralityScoreExplanation,
        duration: c.duration,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
    }));

    return { ...experiment, status: computedStatus, jobs: jobsWithClips };
  }, {
    detail: {
      summary: 'Get experiment by id with joined jobs',
      description: 'Return an experiment and its associated jobs by ID',
    },
  })

  .delete('/:id', async ({ params, set, request }) => {
    try {
      await requireOwner(request.headers);
    } catch (error) {
      const { status, body } = authGuard(error);
      set.status = status;
      return body;
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) { set.status = 400; return { error: 'Missing id' }; }

    const [existing] = await db.select().from(experiments).where(eq(experiments.id, id));
    if (!existing) { set.status = 404; return { error: 'Experiment not found' }; }

    // Cascade: delete clips -> jobs -> experiment
    const relatedJobs = await db.select().from(jobs).where(eq(jobs.experimentId, id));
    const jobIds = relatedJobs.map(j => j.id);
    if (jobIds.length > 0) {
      await db.delete(clips).where(inArray(clips.jobId, jobIds));
    }
    await db.delete(jobs).where(eq(jobs.experimentId, id));
    await db.delete(experiments).where(eq(experiments.id, id));
    return { message: 'Experiment deleted', id };
  }, {
    detail: {
      summary: 'Delete an experiment by ID',
      description: 'Removes the experiment and all associated jobs and clips.',
    },
  })

  .get('/:id/export', async ({ params, request, set }) => {
    try {
      await requireOwner(request.headers);
    } catch (error) {
      const { status, body } = authGuard(error);
      set.status = status;
      return body;
    }

    const id = (params as any)?.id as string | undefined;
    if (!id) { set.status = 400; return { error: 'Missing id' }; }

    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    if (!experiment) { set.status = 404; return { error: 'Experiment not found' }; }

    const relatedJobs = await db.select().from(jobs).where(eq(jobs.experimentId, id));
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
      'clip_title', 'virality_score', 'virality_score_explanation',
      'duration', 'start_time', 'end_time',
    ].map(csvEscape).join(',');

    const rows: string[] = [header];

    for (const job of relatedJobs) {
      const jobClips = relatedClips.filter(c => c.jobId === job.id);
      if (jobClips.length === 0) {
        rows.push([
          csvEscape(experiment.name), csvEscape(experiment.description),
          csvEscape(experiment.status), csvEscape(experiment.sourceVideoUrl),
          csvEscape(job.id), csvEscape(job.status), csvEscape(job.errorMessage),
          '', '', '', '', '', '',
        ].join(','));
      } else {
        for (const clip of jobClips) {
          rows.push([
            csvEscape(experiment.name), csvEscape(experiment.description),
            csvEscape(experiment.status), csvEscape(experiment.sourceVideoUrl),
            csvEscape(job.id), csvEscape(job.status), csvEscape(job.errorMessage),
            csvEscape(clip.title), csvEscape(clip.viralityScore),
            csvEscape(clip.viralityScoreExplanation),
            csvEscape(clip.duration), csvEscape(clip.startTime), csvEscape(clip.endTime),
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
