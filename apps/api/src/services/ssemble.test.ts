import { describe, it, expect } from 'bun:test';

// Unit tests for the Ssemble provider adapter.
// HTTP is mocked via globalThis.fetch replacement — no real network calls.

describe('Ssemble adapter - createProject', () => {
  it('returns provider project ID from API response', async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ id: 'req_abc123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      const id = await ssembleProvider.createProject('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('req_abc123');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('sends url in request body', async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl: string | undefined;
    let capturedBody: any = null;

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string ?? '{}');
      return new Response(JSON.stringify({ id: 'req_xyz' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      await ssembleProvider.createProject('https://www.youtube.com/watch?v=abc123');
      expect(capturedUrl).toContain('/shorts/create');
      expect(capturedBody.url).toBe('https://www.youtube.com/watch?v=abc123');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Ssemble adapter - getProjectStatus', () => {
  const cases: Array<[string, 'processing' | 'completed' | 'failed']> = [
    ['queued', 'processing'],
    ['processing', 'processing'],
    ['completed', 'completed'],
    ['failed', 'failed'],
  ];

  for (const [raw, expected] of cases) {
    it(`maps "${raw}" -> "${expected}"`, async () => {
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = async () =>
        new Response(
          JSON.stringify({ status: raw, progress: 50, step: 'processing' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );

      try {
        const { ssembleProvider } = await import('./providers/ssemble');
        const status = await ssembleProvider.getProjectStatus('req_1');
        expect(status).toBe(expected);
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  }
});

describe('Ssemble adapter - getClips', () => {
  it('maps short fields to ProviderClip shape', async () => {
    const originalFetch = globalThis.fetch;
    const mockShort = {
      id: 'short_uuid_1',
      title: 'Best clip ever',
      viral_score: 88,
      video_url: 'https://cdn.ssemble.com/short.mp4',
      duration: 30,
      startTimestamp: 120,
      endTimestamp: 150,
      reason: 'High emotional impact',
      description: 'Great clip with hashtags',
      width: 1080,
      height: 1920,
      recompiling: false,
      error: false,
    };

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ data: { shorts: [mockShort] } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      const clips = await ssembleProvider.getClips('req_1');
      expect(clips).toHaveLength(1);
      expect(clips[0]!.providerClipId).toBe('short_uuid_1');
      expect(clips[0]!.title).toBe('Best clip ever');
      expect(clips[0]!.viralityScore).toBe(88);   // already 0–100
      expect(clips[0]!.duration).toBe(30);
      expect(clips[0]!.startTime).toBe(120);
      expect(clips[0]!.endTime).toBe(150);
      expect(clips[0]!.clipUrl).toBe('https://cdn.ssemble.com/short.mp4'); // stable URL
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('sorts clips by viral_score descending', async () => {
    const originalFetch = globalThis.fetch;
    const mockShorts = [
      { id: 's3', title: 'Low', viral_score: 30, video_url: 'https://c.com/3', duration: 30, startTimestamp: 0, endTimestamp: 30, reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
      { id: 's1', title: 'High', viral_score: 95, video_url: 'https://c.com/1', duration: 30, startTimestamp: 0, endTimestamp: 30, reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
      { id: 's2', title: 'Medium', viral_score: 60, video_url: 'https://c.com/2', duration: 30, startTimestamp: 0, endTimestamp: 30, reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ data: { shorts: mockShorts } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      const clips = await ssembleProvider.getClips('req_1');
      expect(clips).toHaveLength(3);
      expect(clips[0]!.viralityScore).toBe(95);
      expect(clips[1]!.viralityScore).toBe(60);
      expect(clips[2]!.viralityScore).toBe(30);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('filters out errored clips', async () => {
    const originalFetch = globalThis.fetch;
    const mockShorts = [
      { id: 'good', title: 'Good', viral_score: 80, video_url: 'https://c.com/g', duration: 30, startTimestamp: 0, endTimestamp: 30, reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
      { id: 'bad', title: 'Bad', viral_score: 0, video_url: '', duration: 0, startTimestamp: 0, endTimestamp: 0, reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: true, errorMessage: 'Render failed' },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ data: { shorts: mockShorts } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      const clips = await ssembleProvider.getClips('req_1');
      expect(clips).toHaveLength(1);
      expect(clips[0]!.providerClipId).toBe('good');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Ssemble adapter - getClipUrls', () => {
  it('returns Map of short id -> video_url', async () => {
    const originalFetch = globalThis.fetch;
    const mockShorts = [
      { id: 's1', video_url: 'https://cdn.ssemble.com/s1.mp4', viral_score: 9, duration: 30, startTimestamp: 0, endTimestamp: 30, title: 'A', reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
      { id: 's2', video_url: 'https://cdn.ssemble.com/s2.mp4', viral_score: 7, duration: 30, startTimestamp: 0, endTimestamp: 30, title: 'B', reason: '', description: '', width: 1080, height: 1920, recompiling: false, error: false },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ data: { shorts: mockShorts } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { ssembleProvider } = await import('./providers/ssemble');
      const urlMap = await ssembleProvider.getClipUrls('req_1');
      expect(urlMap.get('s1')).toBe('https://cdn.ssemble.com/s1.mp4');
      expect(urlMap.get('s2')).toBe('https://cdn.ssemble.com/s2.mp4');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
