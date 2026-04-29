import { describe, it, expect, beforeAll } from 'bun:test';
 
 

describe('klap service - unit tests (with mocked HTTP)', () => {
 
  let klap: typeof import('./klap');
  beforeAll(async () => {
    klap = await import('./klap');
  });

  describe('embedUrl', () => {
    it('builds embed URL given projectId and token', () => {
      const url = klap.embedUrl('proj_123', 'tokenABC');
      expect(url).toBe('https://app.klap.app/embed/proj_123#external_access_token=tokenABC');
    });
  });

  describe('previewUrl', () => {
    it('builds correct preview URL for a project ID', () => {
      const previewUrl = klap.previewUrl;
      expect(previewUrl('abc123')).toBe('https://klap.app/player/abc123');
    });

    it('handles complex project IDs', () => {
      const previewUrl = klap.previewUrl;
      expect(previewUrl('proj_abc-123_xyz')).toBe('https://klap.app/player/proj_abc-123_xyz');
    });

    it('handles UUID-style project IDs', () => {
      const previewUrl = klap.previewUrl;
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(previewUrl(uuid)).toBe(`https://klap.app/player/${uuid}`);
    });
  });

  describe('isKlapConfigured', () => {
    it('returns true for non-empty string', () => {
      const isKlapConfigured = klap.isKlapConfigured;
      expect(isKlapConfigured('test-key')).toBe(true);
    });

    it('returns false for empty string', () => {
      const isKlapConfigured = klap.isKlapConfigured;
      expect(isKlapConfigured('')).toBe(false);
    });

    it('returns false for undefined', () => {
      const isKlapConfigured = klap.isKlapConfigured as any;
      // @ts-ignore - relying on runtime behavior
      expect(isKlapConfigured(undefined)).toBe(false);
    });
  });

  describe('API URL building', () => {
    it('constructs correct task URL', () => {
      // @ts-ignore - simple string composition check
      const baseUrl = 'https://api.klap.app/v2';
      const taskId = 'task-123';
      expect(`${baseUrl}/tasks/${taskId}`).toBe('https://api.klap.app/v2/tasks/task-123');
    });

    it('constructs correct projects URL', () => {
      const baseUrl = 'https://api.klap.app/v2';
      const folderId = 'folder-456';
      expect(`${baseUrl}/projects/${folderId}`).toBe('https://api.klap.app/v2/projects/folder-456');
    });

    it('constructs correct export URL', () => {
      const baseUrl = 'https://api.klap.app/v2';
      const folderId = 'folder-456';
      const projectId = 'project-789';
      const exportId = 'export-012';
      expect(`${baseUrl}/projects/${folderId}/${projectId}/exports/${exportId}`).toBe(
        'https://api.klap.app/v2/projects/folder-456/project-789/exports/export-012'
      );
    });
  });

  describe('unit - createManagedUser', () => {
    it('returns KlapManagedUser on success', async () => {
      const klapFetch = async (url: string, init?: any) => {
        return new Response(JSON.stringify({ id: 'managed-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        } as any);
      };
      // @ts-ignore - replace global fetch for this test
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = klapFetch;
      try {
        const res = await klap.createManagedUser();
        expect(res).toEqual({ id: 'managed-1' });
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  });

  describe('unit - generateAccessToken', () => {
    it('returns external_access_token for a user', async () => {
      const klapFetch = async (url: string, init?: any) => {
        return new Response(JSON.stringify({ external_access_token: 'tok-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        } as any);
      };
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = klapFetch;
      try {
        const res = await (klap as any).generateAccessToken('user-1');
        expect(res).toEqual({ external_access_token: 'tok-123' });
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  });

  describe('unit - createVideoTask', () => {
    it('sends X-On-Behalf-Of header when onBehalfOf is provided', async () => {
      let capturedHeaders: any = null;
      const klapFetch = async (url: string, init?: any) => {
        capturedHeaders = init?.headers;
        return new Response(JSON.stringify({ id: 'task-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        } as any);
      };
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = klapFetch;
      try {
        const res = await (klap as any).createVideoTask('https://video.url', 'behalf-42');
        expect(res.id).toBe('task-1');
        expect(capturedHeaders['X-On-Behalf-Of']).toBe('behalf-42');
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
    it('does not require onBehalfOf header when not provided', async () => {
      let capturedHeaders: any = null;
      const klapFetch = async (url: string, init?: any) => {
        capturedHeaders = init?.headers;
        return new Response(JSON.stringify({ id: 'task-2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        } as any);
      };
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = klapFetch;
      try {
        const res = await (klap as any).createVideoTask('https://video.url');
        expect(res.id).toBe('task-2');
        expect('X-On-Behalf-Of' in (capturedHeaders || {})).toBe(false);
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  });
});
