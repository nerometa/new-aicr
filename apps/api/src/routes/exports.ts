import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createExport, getExport } from '../services/klap';

// Helper to get clip with folder ID (eliminates duplication)
const getClipWithFolder = async (clipId: string) => {
  const [clip] = await db.select().from(clips).where(eq(clips.id, clipId));
  return clip?.klapFolderId ? { clip, folderId: clip.klapFolderId } : null;
};

export const exportsRoute = new Elysia({ prefix: '/api/exports' })
  .post('/:clipId', async ({ params, set }) => {
    const result = await getClipWithFolder(params.clipId);
    if (!result) {
      set.status = 404;
      return { error: 'Clip not found' };
    }

    const exportResult = await createExport(result.folderId, params.clipId);
    await db.update(clips).set({ exportStatus: 'processing' }).where(eq(clips.id, params.clipId));

    return { exportId: exportResult.id, status: 'processing' };
  })
  .get('/:clipId/:exportId', async ({ params, set }) => {
    const result = await getClipWithFolder(params.clipId);
    if (!result) {
      set.status = 404;
      return { error: 'Clip not found' };
    }

    const exportResult = await getExport(result.folderId, params.clipId, params.exportId);

    // Klap uses 'ready' not 'done' for completed exports
    if (exportResult.status === 'ready' && exportResult.src_url) {
      await db.update(clips)
        .set({ exportStatus: 'ready', exportUrl: exportResult.src_url })
        .where(eq(clips.id, params.clipId));
      return { status: 'ready', exportUrl: exportResult.src_url };
    }

    return { status: exportResult.status || 'processing' };
  });
