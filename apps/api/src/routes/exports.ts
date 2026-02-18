import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { clips } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createExport, getExport } from '../services/klap';
import type { KlapExport } from '../services/klap';
import { randomUUID } from 'crypto';

export const exportsRoute = new Elysia({ prefix: '/api/exports' })
  .post('/:clipId', async ({ params }) => {
    const [clip] = await db.select().from(clips).where(eq(clips.id, params.clipId));
    if (!clip?.klapFolderId) return { error: 'Clip not found' };

    const exportResult: KlapExport = await createExport(clip.klapFolderId, params.clipId);
    
    await db.update(clips)
      .set({ exportStatus: 'processing' })
      .where(eq(clips.id, params.clipId));

    return { exportId: exportResult.id, status: 'processing' };
  })
  .get('/:clipId/:exportId', async ({ params }) => {
    const [clip] = await db.select().from(clips).where(eq(clips.id, params.clipId));
    if (!clip?.klapFolderId) return { error: 'Clip not found' };

    const exportResult: KlapExport = await getExport(clip.klapFolderId, params.clipId, params.exportId);

    if (exportResult.status === 'done' && exportResult.src_url) {
      await db.update(clips)
        .set({ exportStatus: 'done', exportUrl: exportResult.src_url })
        .where(eq(clips.id, params.clipId));
      return { status: 'done', exportUrl: exportResult.src_url };
    }

    return { status: exportResult.status || 'processing' };
  });
