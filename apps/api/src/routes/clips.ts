import { Elysia } from 'elysia';
import { db } from '../db/client';
import { clips } from '../db/schema';
import { eq } from 'drizzle-orm';

export const clipsRoute = new Elysia({ prefix: '/api/clips' })
  .get('/:jobId', async ({ params }) => {
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
