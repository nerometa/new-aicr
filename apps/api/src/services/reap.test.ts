import { describe, it, expect } from 'bun:test';

// Unit tests for the Reap provider adapter.
// HTTP is mocked via globalThis.fetch replacement — no real network calls.

describe('Reap adapter - DEFAULT_CLIP_CONFIG', () => {
  it('has expected shape', async () => {
    const { DEFAULT_CLIP_CONFIG } = await import('./providers/reap');
    expect(DEFAULT_CLIP_CONFIG.exportOrientation).toBe('portrait');
    expect(DEFAULT_CLIP_CONFIG.enableCaptions).toBe(true);
    expect(DEFAULT_CLIP_CONFIG.enableEmojis).toBe(false);
    expect(DEFAULT_CLIP_CONFIG.exportResolution).toBe(1080);
    expect(DEFAULT_CLIP_CONFIG.clipDurations).toEqual([[0, 30]]);
  });
});

describe('Reap adapter - createProject', () => {
  it('returns provider project ID from API response', async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ id: 'proj_reap_001', status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const { reapProvider } = await import('./providers/reap');
      const id = await reapProvider.createProject('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('proj_reap_001');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('sends sourceUrl in request body', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: any = null;

    (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string ?? '{}');
      return new Response(JSON.stringify({ id: 'proj_001', status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { reapProvider } = await import('./providers/reap');
      await reapProvider.createProject('https://www.youtube.com/watch?v=abc123');
      expect(capturedBody.sourceUrl).toBe('https://www.youtube.com/watch?v=abc123');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('respects ClipConfig overrides', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: any = null;

    (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string ?? '{}');
      return new Response(JSON.stringify({ id: 'proj_002', status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { reapProvider } = await import('./providers/reap');
      await reapProvider.createProject('https://youtu.be/xyz', {
        clipDuration: 60,
        orientation: 'landscape',
        captions: false,
        emojis: true,
      });
      expect(capturedBody.clipDurations).toEqual([[30, 60]]);
      expect(capturedBody.exportOrientation).toBe('landscape');
      expect(capturedBody.enableCaptions).toBe(false);
      expect(capturedBody.enableEmojis).toBe(true);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Reap adapter - getProjectStatus', () => {
  const cases: Array<[string, 'processing' | 'completed' | 'failed']> = [
    ['queued', 'processing'],
    ['processing', 'processing'],
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['invalid', 'failed'],
    ['expired', 'failed'],
  ];

  for (const [raw, expected] of cases) {
    it(`maps "${raw}" -> "${expected}"`, async () => {
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = async () =>
        new Response(
          JSON.stringify({ projectId: 'p1', projectType: 'clipping', source: 'Youtube', status: raw }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );

      try {
        const { reapProvider } = await import('./providers/reap');
        const status = await reapProvider.getProjectStatus('p1');
        expect(status).toBe(expected);
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  }
});

describe('Reap adapter - getClips', () => {
  it('maps clip fields to ProviderClip shape', async () => {
    const originalFetch = globalThis.fetch;
    const mockClip = {
      id: 'clip_001',
      projectId: 'proj_001',
      clipUrl: 'https://cdn.reap.video/clip.mp4',
      startTime: 10.5,
      endTime: 40.2,
      duration: 29.7,
      title: 'Great moment',
      caption: 'Caption text',
      viralityScore: 8.5,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    };

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ clips: [mockClip], totalClips: 1, totalPages: 1, currentPage: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { reapProvider } = await import('./providers/reap');
      const clips = await reapProvider.getClips('proj_001');
      expect(clips).toHaveLength(1);
      expect(clips[0]!.providerClipId).toBe('clip_001');
      expect(clips[0]!.title).toBe('Great moment');
      expect(clips[0]!.viralityScore).toBe(8.5);
      expect(clips[0]!.duration).toBe(29.7);
      expect(clips[0]!.startTime).toBe(10.5);
      expect(clips[0]!.endTime).toBe(40.2);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('caps results at 3 clips sorted by virality descending', async () => {
    const originalFetch = globalThis.fetch;
    const mockClips = [1, 2, 3, 4, 5].map(n => ({
      id: `clip_00${n}`,
      projectId: 'proj_001',
      clipUrl: `https://cdn.reap.video/clip${n}.mp4`,
      startTime: 0,
      endTime: 30,
      duration: 30,
      title: `Clip ${n}`,
      caption: null,
      viralityScore: n, // 1..5, ascending — adapter should pick 5,4,3
      createdAt: 1700000000,
      updatedAt: 1700000000,
    }));

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ clips: mockClips, totalClips: 5, totalPages: 1, currentPage: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { reapProvider } = await import('./providers/reap');
      const clips = await reapProvider.getClips('proj_001');
      expect(clips).toHaveLength(3);
      expect(clips[0]!.viralityScore).toBe(5);
      expect(clips[1]!.viralityScore).toBe(4);
      expect(clips[2]!.viralityScore).toBe(3);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Reap adapter - getClipUrls', () => {
  it('returns Map of clipId -> clipUrl', async () => {
    const originalFetch = globalThis.fetch;
    const mockClips = [
      { id: 'c1', clipUrl: 'https://cdn.reap.video/c1.mp4', viralityScore: 9, startTime: 0, endTime: 30, duration: 30, title: 'A', caption: null, projectId: 'p', createdAt: 0, updatedAt: 0 },
      { id: 'c2', clipUrl: 'https://cdn.reap.video/c2.mp4', viralityScore: 7, startTime: 0, endTime: 30, duration: 30, title: 'B', caption: null, projectId: 'p', createdAt: 0, updatedAt: 0 },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ clips: mockClips, totalClips: 2, totalPages: 1, currentPage: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { reapProvider } = await import('./providers/reap');
      const urlMap = await reapProvider.getClipUrls('proj_001');
      expect(urlMap.get('c1')).toBe('https://cdn.reap.video/c1.mp4');
      expect(urlMap.get('c2')).toBe('https://cdn.reap.video/c2.mp4');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Provider factory', () => {
  it('exports a ClipProvider instance', async () => {
    const { provider } = await import('./providers/index');
    expect(typeof provider.createProject).toBe('function');
    expect(typeof provider.getProjectStatus).toBe('function');
    expect(typeof provider.getClips).toBe('function');
    expect(typeof provider.getClipUrls).toBe('function');
  });
});
