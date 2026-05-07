import { env } from '../../env';
import type { ClipProvider, ClipConfig, ProviderClip } from './types';

const BASE = 'https://vision-agent.api.reka.ai';
const TIMEOUT_MS = 30_000;

// ─── Default config ──────────────────────────────────────────────────────────
// Baked in as a const — not env vars, not DB config.
export const DEFAULT_CLIP_CONFIG = {
  template: 'moments' as const,
  numGenerations: 3,
  maxDurationSeconds: 90,
  aspectRatio: '9:16' as const,
  subtitles: true,
  resolution: 720,
};

// ─── Internal types ───────────────────────────────────────────────────────────

interface RekaClipOutput {
  title: string;
  video_url: string;
  caption: string | null;
  hashtags: string[];
  ai_score: number;
}

interface RekaJobResponse {
  id: string;
  status: string;
  output: RekaClipOutput[];
  error_message: string | null;
}

// ─── Orientation mapping ──────────────────────────────────────────────────────

type RekaAspectRatio = '9:16' | '16:9' | '1:1';

function toAspectRatio(orientation?: ClipConfig['orientation']): RekaAspectRatio {
  switch (orientation) {
    case 'landscape': return '16:9';
    case 'square': return '1:1';
    default: return '9:16'; // portrait
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function rekaRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'X-Api-Key': env.REKA_API_KEY,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Reka API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

async function createProject(
  sourceUrl: string,
  config?: ClipConfig,
): Promise<string> {
  const maxDuration =
    config?.clipDuration ?? DEFAULT_CLIP_CONFIG.maxDurationSeconds;

  const body = {
    video_urls: [sourceUrl],
    generation_config: {
      template: DEFAULT_CLIP_CONFIG.template,
      num_generations: DEFAULT_CLIP_CONFIG.numGenerations,
      min_duration_seconds: 0,
      max_duration_seconds: maxDuration,
    },
    rendering_config: {
      subtitles: config?.captions ?? DEFAULT_CLIP_CONFIG.subtitles,
      aspect_ratio: toAspectRatio(config?.orientation),
      resolution: DEFAULT_CLIP_CONFIG.resolution,
    },
  };

  const res = await rekaRequest<RekaJobResponse>('/v1/clips', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return res.id;
}

async function getProjectStatus(
  providerProjectId: string,
): Promise<'processing' | 'completed' | 'failed'> {
  const res = await rekaRequest<RekaJobResponse>(
    `/v1/clips/${encodeURIComponent(providerProjectId)}`,
  );

  switch (res.status) {
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    default: return 'processing'; // queued | starting | downloading | indexing | preprocessing | processing
  }
}

async function getClips(providerProjectId: string): Promise<ProviderClip[]> {
  const res = await rekaRequest<RekaJobResponse>(
    `/v1/clips/${encodeURIComponent(providerProjectId)}`,
  );

  if (res.status !== 'completed' || !res.output?.length) return [];

  return [...res.output]
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .map((c, i) => ({
      // Reka has no stable clip ID — use job ID + index as opaque key
      providerClipId: `${providerProjectId}:${i}`,
      title: c.title ?? null,
      // Reka ai_score is already 0–100
      viralityScore: c.ai_score ?? null,
      viralityScoreExplanation: c.caption ?? null,
      duration: null, // Reka doesn't return duration in completion payload
      startTime: null,
      endTime: null,
      // Reka returns stable URLs at completion — store directly
      clipUrl: c.video_url ?? null,
    }));
}

async function getClipUrls(
  providerProjectId: string,
): Promise<Map<string, string>> {
  // Re-fetch the job to get current output URLs.
  // Reka URLs may be long-lived but we don't cache — re-fetch on demand
  // same as getClips to stay consistent.
  const res = await rekaRequest<RekaJobResponse>(
    `/v1/clips/${encodeURIComponent(providerProjectId)}`,
  );

  const map = new Map<string, string>();
  if (res.status !== 'completed' || !res.output?.length) return map;

  res.output.forEach((c, i) => {
    const clipId = `${providerProjectId}:${i}`;
    if (c.video_url) map.set(clipId, c.video_url);
  });

  return map;
}

export const rekaProvider: ClipProvider = {
  createProject,
  getProjectStatus,
  getClips,
  getClipUrls,
};
