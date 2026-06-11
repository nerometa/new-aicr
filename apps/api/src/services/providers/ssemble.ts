import { env } from '../../env';
import type { ClipProvider, ClipConfig, ProviderClip } from './types';

const BASE = 'https://aiclipping.ssemble.com/api/v1';
const TIMEOUT_MS = 30_000;

// ─── Internal types ───────────────────────────────────────────────────────────

interface SsembleCreateResponse {
  id: string;
}

interface SsembleStatusResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  step: string;
}

interface SsembleShort {
  id: string;
  title: string;
  viral_score: number;
  video_url: string;
  duration: number;
  startTimestamp: number;
  endTimestamp: number;
  reason: string;
  description: string;
  width: number;
  height: number;
  recompiling: boolean;
  error: boolean;
  errorMessage?: string;
}

interface SsembleShortsResponse {
  data: {
    shorts: SsembleShort[];
  };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function ssembleRequest<T>(
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
        'X-API-Key': env.SSEMBLE_API_KEY!,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ssemble API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

async function createProject(
  sourceUrl: string,
  _config?: ClipConfig,
): Promise<string> {
  const body: Record<string, unknown> = {
    url: sourceUrl,
  };

  const res = await ssembleRequest<SsembleCreateResponse>('/shorts/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return res.id;
}

async function getProjectStatus(
  providerProjectId: string,
): Promise<'processing' | 'completed' | 'failed'> {
  const res = await ssembleRequest<SsembleStatusResponse>(
    `/shorts/${encodeURIComponent(providerProjectId)}/status`,
  );

  switch (res.status) {
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    default: return 'processing'; // queued | processing
  }
}

async function getClips(providerProjectId: string): Promise<ProviderClip[]> {
  const res = await ssembleRequest<SsembleShortsResponse>(
    `/shorts/${encodeURIComponent(providerProjectId)}`,
  );

  if (!res.data?.shorts?.length) return [];

  return [...res.data.shorts]
    .filter(s => !s.error)      // skip errored clips
    .sort((a, b) => (b.viral_score ?? 0) - (a.viral_score ?? 0))
    .map((s) => ({
      providerClipId: s.id,
      title: s.title ?? null,
      // Ssemble viral_score is already 0–100
      viralityScore: s.viral_score ?? null,
      viralityScoreExplanation: s.reason ?? null,
      duration: s.duration ?? null,
      startTime: s.startTimestamp ?? null,
      endTime: s.endTimestamp ?? null,
      // Ssemble video URLs appear to be stable per completion payload
      clipUrl: s.video_url ?? null,
    }));
}

async function getClipUrls(
  providerProjectId: string,
): Promise<Map<string, string>> {
  const res = await ssembleRequest<SsembleShortsResponse>(
    `/shorts/${encodeURIComponent(providerProjectId)}`,
  );

  const map = new Map<string, string>();
  if (!res.data?.shorts?.length) return map;

  for (const s of res.data.shorts) {
    if (s.video_url) map.set(s.id, s.video_url);
  }

  return map;
}

export const ssembleProvider: ClipProvider = {
  createProject,
  getProjectStatus,
  getClips,
  getClipUrls,
};
