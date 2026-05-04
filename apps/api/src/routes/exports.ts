import { Elysia } from 'elysia';
import { db } from '../db/client';
import { clips, jobs, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createExport, getExport } from '../services/klap';
import { auth } from '../lib/auth';

const getClipWithFolder = async (clipId: string) => {
  const [clip] = await db.select().from(clips).where(eq(clips.id, clipId));
  return clip?.klapFolderId ? { clip, folderId: clip.klapFolderId } : null;
};

async function checkClipOwnership(clipId: string, request: Request): Promise<{ authorized: boolean; set: any }> {
  const api: any = (auth as any).api;
  if (!api || typeof api.getSession !== 'function') {
    return { authorized: false, set: { status: 401 } };
  }

  const session: any = await api.getSession({ headers: request.headers as any });
  if (!session?.user?.id) {
    return { authorized: false, set: { status: 401 } };
  }

  const results = await db.select().from(user).where(eq(user.id, session.user.id));
  const found: any[] = results as any;
  if (!found || found.length === 0) {
    return { authorized: false, set: { status: 401 } };
  }

  const dbUserId = found[0].id;
  const [clip] = await db.select().from(clips).where(eq(clips.id, clipId));
  if (!clip) {
    return { authorized: false, set: { status: 404 } };
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, clip.jobId!));
  if (!job || job.userId !== dbUserId) {
    return { authorized: false, set: { status: 403 } };
  }

  return { authorized: true, set: null };
}

export const exportsRoute = new Elysia({ prefix: '/api/exports' })
  .post('/:clipId', async ({ params, request, set }) => {
    const ownership = await checkClipOwnership(params.clipId, request);
    if (!ownership.authorized) {
      set.status = ownership.set.status;
      return { error: 'Unauthorized', message: ownership.set.status === 404 ? 'Clip not found' : 'Authentication required' };
    }

    const result = await getClipWithFolder(params.clipId);
    if (!result) {
      set.status = 404;
      return { error: 'Clip not found' };
    }

    const exportResult = await createExport(result.folderId, params.clipId);
    await db.update(clips).set({ exportStatus: 'processing' }).where(eq(clips.id, params.clipId));

    return { exportId: exportResult.id, status: 'processing' };
  })
  .get('/:clipId/:exportId', async ({ params, request, set }) => {
    const ownership = await checkClipOwnership(params.clipId, request);
    if (!ownership.authorized) {
      set.status = ownership.set.status;
      return { error: 'Unauthorized', message: ownership.set.status === 404 ? 'Clip not found' : 'Authentication required' };
    }

    const result = await getClipWithFolder(params.clipId);
    if (!result) {
      set.status = 404;
      return { error: 'Clip not found' };
    }

    const exportResult = await getExport(result.folderId, params.clipId, params.exportId);

    if (exportResult.status === 'ready' && exportResult.src_url) {
      await db.update(clips)
        .set({ exportStatus: 'ready', exportUrl: exportResult.src_url })
        .where(eq(clips.id, params.clipId));
      return { status: 'ready', exportUrl: exportResult.src_url };
    }

    return { status: exportResult.status || 'processing' };
  });
