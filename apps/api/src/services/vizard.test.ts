import { describe, it, expect } from 'bun:test';

// Unit tests for the Vizard provider adapter.
// HTTP is mocked via globalThis.fetch replacement — no real network calls.

describe('Vizard adapter - createProject', () => {
  it('returns provider project ID from API response', async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ code: 2000, projectId: 42, shareLink: '', errMsg: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const { vizardProvider } = await import('./providers/vizard');
      const id = await vizardProvider.createProject('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('42');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('sends correct body with default config', async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl: string | undefined;
    let capturedBody: any = null;

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string ?? '{}');
      return new Response(JSON.stringify({ code: 2000, projectId: 1, shareLink: '', errMsg: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { vizardProvider } = await import('./providers/vizard');
      await vizardProvider.createProject('https://www.youtube.com/watch?v=abc123');
      expect(capturedUrl).toContain('/create');
      expect(capturedBody.videoUrl).toBe('https://www.youtube.com/watch?v=abc123');
      expect(capturedBody.videoType).toBe(2);
      expect(capturedBody.lang).toBe('en');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('respects ClipConfig overrides', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: any = null;

    (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string ?? '{}');
      return new Response(JSON.stringify({ code: 2000, projectId: 3, shareLink: '', errMsg: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { vizardProvider } = await import('./providers/vizard');
      await vizardProvider.createProject('https://youtu.be/xyz', {
        clipDuration: 90,
        orientation: 'landscape',
      });
      expect(capturedBody.preferLength).toEqual([3]);  // 90s → [3]
      expect(capturedBody.ratioOfClip).toBe(4);          // landscape → 4
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Vizard adapter - getProjectStatus', () => {
  const cases: Array<[number, 'processing' | 'completed' | 'failed']> = [
    [1000, 'processing'],
    [2000, 'completed'],
    [4002, 'failed'],
    [4003, 'failed'],
    [9999, 'failed'],
  ];

  for (const [code, expected] of cases) {
    it(`maps code ${code} -> "${expected}"`, async () => {
      const originalFetch = globalThis.fetch;
      (globalThis as any).fetch = async () =>
        new Response(
          JSON.stringify({ code, projectId: 1, projectName: '', shareLink: null, videos: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );

      try {
        const { vizardProvider } = await import('./providers/vizard');
        const status = await vizardProvider.getProjectStatus('1');
        expect(status).toBe(expected);
      } finally {
        (globalThis as any).fetch = originalFetch;
      }
    });
  }
});

describe('Vizard adapter - getClips', () => {
  it('maps video fields to ProviderClip shape', async () => {
    const originalFetch = globalThis.fetch;
    const mockVideo = {
      videoId: 101,
      videoUrl: 'https://cdn.vizard.ai/clip.mp4',
      videoMsDuration: 29700,
      title: 'Amazing moment',
      transcript: 'Full transcript text',
      viralScore: '8.5',
      viralReason: 'High engagement potential',
      relatedTopic: '["topic1"]',
      clipEditorUrl: 'https://editor.vizard.ai/101',
    };

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({
          code: 2000,
          projectId: 1,
          projectName: 'Test',
          shareLink: null,
          videos: [mockVideo],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { vizardProvider } = await import('./providers/vizard');
      const clips = await vizardProvider.getClips('1');
      expect(clips).toHaveLength(1);
      expect(clips[0]!.providerClipId).toBe('101');
      expect(clips[0]!.title).toBe('Amazing moment');
      expect(clips[0]!.viralityScore).toBe(85); // 8.5 × 10
      expect(clips[0]!.duration).toBe(30);       // 29700ms / 1000 = 29.7 ≈ 30
      expect(clips[0]!.startTime).toBeNull();
      expect(clips[0]!.endTime).toBeNull();
      expect(clips[0]!.clipUrl).toBeNull();       // ephemeral URLs
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('sorts clips by viral score descending', async () => {
    const originalFetch = globalThis.fetch;
    const mockVideos = [
      { videoId: 1, viralScore: '3.0', videoUrl: 'https://c.com/1', videoMsDuration: 10000, title: 'C', transcript: '', viralReason: '', relatedTopic: '', clipEditorUrl: '' },
      { videoId: 2, viralScore: '9.0', videoUrl: 'https://c.com/2', videoMsDuration: 10000, title: 'A', transcript: '', viralReason: '', relatedTopic: '', clipEditorUrl: '' },
      { videoId: 3, viralScore: '6.0', videoUrl: 'https://c.com/3', videoMsDuration: 10000, title: 'B', transcript: '', viralReason: '', relatedTopic: '', clipEditorUrl: '' },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ code: 2000, projectId: 1, projectName: '', shareLink: null, videos: mockVideos }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { vizardProvider } = await import('./providers/vizard');
      const clips = await vizardProvider.getClips('1');
      expect(clips).toHaveLength(3);
      expect(clips[0]!.viralityScore).toBe(90);  // 9.0 × 10
      expect(clips[1]!.viralityScore).toBe(60);  // 6.0 × 10
      expect(clips[2]!.viralityScore).toBe(30);  // 3.0 × 10
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('returns empty array when project is not completed', async () => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ code: 1000, projectId: 1, projectName: '', shareLink: null, videos: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { vizardProvider } = await import('./providers/vizard');
      const clips = await vizardProvider.getClips('1');
      expect(clips).toEqual([]);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});

describe('Vizard adapter - getClipUrls', () => {
  it('returns Map of videoId -> videoUrl', async () => {
    const originalFetch = globalThis.fetch;
    const mockVideos = [
      { videoId: 10, videoUrl: 'https://cdn.vizard.ai/10.mp4', viralScore: '9', videoMsDuration: 10000, title: 'A', transcript: '', viralReason: '', relatedTopic: '', clipEditorUrl: '' },
      { videoId: 20, videoUrl: 'https://cdn.vizard.ai/20.mp4', viralScore: '7', videoMsDuration: 10000, title: 'B', transcript: '', viralReason: '', relatedTopic: '', clipEditorUrl: '' },
    ];

    (globalThis as any).fetch = async () =>
      new Response(
        JSON.stringify({ code: 2000, projectId: 1, projectName: '', shareLink: null, videos: mockVideos }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const { vizardProvider } = await import('./providers/vizard');
      const urlMap = await vizardProvider.getClipUrls('1');
      expect(urlMap.get('10')).toBe('https://cdn.vizard.ai/10.mp4');
      expect(urlMap.get('20')).toBe('https://cdn.vizard.ai/20.mp4');
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
