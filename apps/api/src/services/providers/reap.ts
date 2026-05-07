import { env } from '../../env';
import type { ClipProvider, ClipConfig, ProviderClip } from './types';

const BASE = 'https://public.reap.video/api/v1/automation';
const TIMEOUT_MS = 30_000;

// ─── Default config ──────────────────────────────────────────────────────────
// Baked in as a const — not env vars, not DB config.
// Change here to affect all jobs that don't pass an explicit ClipConfig.
export const DEFAULT_CLIP_CONFIG = {
  clipDurations: [[0, 30]] as [number, number][],
  exportOrientation: 'portrait' as const,
  exportResolution: 1080,
  reframeClips: true,
  captionsPreset: 'system_beasty',
  enableCaptions: true,
  enableEmojis: false,
  genre: 'talking' as const,
};

// ─── Internal types ───────────────────────────────────────────────────────────

interface ReapClip {
  id: string;
  projectId: string;
  clipUrl: string;
  startTime: number;
  endTime: number;
  duration: number;
  title: string;
  caption: string | null;
  viralityScore: number;
  createdAt: number;
  updatedAt: number;
}

interface ReapProjectClipsResponse {
  clips: ReapClip[];
  totalClips: number;
  totalPages: number;
  currentPage: number;
}

interface ReapProjectStatusResponse {
  projectId: string;
  projectType: string;
  source: string;
  status: string;
}

interface ReapCreateClipsResponse {
  id: string;
  status: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function reapRequest<T>(
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
        'Authorization': `Bearer ${env.REAP_API_KEY}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Reap API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Config translation ───────────────────────────────────────────────────────

function buildRequestBody(
  sourceUrl: string,
  config?: ClipConfig,
): Record<string, unknown> {
  const clipDuration = config?.clipDuration ?? 30;
  const clipDurations: [number, number][] =
    clipDuration === 30 ? [[0, 30]]
    : clipDuration === 60 ? [[30, 60]]
    : [[60, 90]];

  return {
    sourceUrl,
    genre: DEFAULT_CLIP_CONFIG.genre,
    exportResolution: DEFAULT_CLIP_CONFIG.exportResolution,
    exportOrientation: config?.orientation ?? DEFAULT_CLIP_CONFIG.exportOrientation,
    reframeClips: DEFAULT_CLIP_CONFIG.reframeClips,
    captionsPreset: DEFAULT_CLIP_CONFIG.captionsPreset,
    enableCaptions: config?.captions ?? DEFAULT_CLIP_CONFIG.enableCaptions,
    enableEmojis: config?.emojis ?? DEFAULT_CLIP_CONFIG.enableEmojis,
    clipDurations,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

async function createProject(
  sourceUrl: string,
  config?: ClipConfig,
): Promise<string> {
  const body = buildRequestBody(sourceUrl, config);
  const res = await reapRequest<ReapCreateClipsResponse>('/create-clips', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.id;
}

async function getProjectStatus(
  providerProjectId: string,
): Promise<'processing' | 'completed' | 'failed'> {
  const res = await reapRequest<ReapProjectStatusResponse>(
    `/get-project-status?projectId=${encodeURIComponent(providerProjectId)}`,
  );

  switch (res.status) {
    case 'completed': return 'completed';
    case 'failed':
    case 'invalid':
    case 'expired':
      return 'failed';
    default:
      return 'processing'; // queued | processing
  }
}

async function getClips(providerProjectId: string): Promise<ProviderClip[]> {
  const res = await reapRequest<ReapProjectClipsResponse>(
    `/get-project-clips?projectId=${encodeURIComponent(providerProjectId)}&pageSize=50`,
  );

  return [...res.clips].sort(
    (a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0),
  ).map((c) => ({
    providerClipId: c.id,
    title: c.title ?? null,
    viralityScore: c.viralityScore ?? null,
    viralityScoreExplanation: null, // Reap doesn't return this field
    duration: c.duration ?? null,
    startTime: c.startTime ?? null,
    endTime: c.endTime ?? null,
  }));
}

async function getClipUrls(
  providerProjectId: string,
): Promise<Map<string, string>> {
  const res = await reapRequest<ReapProjectClipsResponse>(
    `/get-project-clips?projectId=${encodeURIComponent(providerProjectId)}&pageSize=50`,
  );

  const map = new Map<string, string>();
  for (const clip of res.clips) {
    if (clip.clipUrl) map.set(clip.id, clip.clipUrl);
  }
  return map;
}

export const reapProvider: ClipProvider = {
  createProject,
  getProjectStatus,
  getClips,
  getClipUrls,
};
