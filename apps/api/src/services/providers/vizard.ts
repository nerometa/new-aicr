import { env } from '../../env';
import type { ClipProvider, ClipConfig, ProviderClip } from './types';

const BASE = 'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project';
const TIMEOUT_MS = 30_000;

// ─── Default config ──────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  lang: 'en' as const,
  videoType: 2 as const, // YouTube
};

// ─── Internal types ───────────────────────────────────────────────────────────

interface VizardCreateResponse {
  message: string;
  data: {
    projectId: number;
  };
}

interface VizardVideo {
  videoId: number;
  videoUrl: string;
  videoMsDuration: number;
  title: string;
  transcript: string;
  viralScore: string; // "0.0" – "10.0"
  viralReason: string;
  relatedTopic: string;
  clipEditorUrl: string;
  disliked?: boolean;
  starred?: boolean;
}

interface VizardQueryResponse {
  code: number;
  message: string;
  data: {
    projectId: number;
    projectName: string;
    shareLink: string | null;
    videos: VizardVideo[];
  };
}

// ─── Config mapping ──────────────────────────────────────────────────────────

/**
 * Map ClipConfig.clipDuration (30|60|90) to Vizard preferLength array.
 *   30s → [1] (less than 30s)
 *   60s → [2] (30–60s)
 *   90s → [3] (60–90s)
 */
function toPreferLength(clipDuration?: ClipConfig['clipDuration']): number[] {
  switch (clipDuration) {
    case 30: return [1];
    case 60: return [2];
    case 90: return [3];
    default: return [1]; // default <30s
  }
}

/**
 * Map ClipConfig.orientation to Vizard ratioOfClip.
 *   portrait → 1 (9:16)
 *   square   → 2 (1:1)
 *   landscape → 4 (16:9)
 */
function toRatioOfClip(orientation?: ClipConfig['orientation']): number {
  switch (orientation) {
    case 'landscape': return 4;
    case 'square': return 2;
    default: return 1; // portrait
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function vizardRequest<T>(
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
        'VIZARDAI_API_KEY': env.VIZARD_API_KEY!,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Vizard API ${res.status}: ${body}`);
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
  const body = {
    lang: DEFAULT_CONFIG.lang,
    preferLength: toPreferLength(config?.clipDuration),
    videoUrl: sourceUrl,
    videoType: DEFAULT_CONFIG.videoType,
    ratioOfClip: toRatioOfClip(config?.orientation),
  };

  const res = await vizardRequest<VizardCreateResponse>('/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return String(res.data.projectId);
}

async function getProjectStatus(
  providerProjectId: string,
): Promise<'processing' | 'completed' | 'failed'> {
  const res = await vizardRequest<VizardQueryResponse>(
    `/query/${encodeURIComponent(providerProjectId)}`,
  );

  switch (res.code) {
    case 2000: return 'completed';
    case 1000: return 'processing';
    default: return 'failed';
  }
}

async function getClips(providerProjectId: string): Promise<ProviderClip[]> {
  const res = await vizardRequest<VizardQueryResponse>(
    `/query/${encodeURIComponent(providerProjectId)}`,
  );

  if (res.code !== 2000 || !res.data?.videos?.length) return [];

  return [...res.data.videos]
    .sort((a, b) => parseFloat(b.viralScore || '0') - parseFloat(a.viralScore || '0'))
    .map((v) => ({
      // Vizard videoId is a number — stringify for opaque providerClipId
      providerClipId: String(v.videoId),
      title: v.title ?? null,
      // Normalize 0–10 → 0–100
      viralityScore: v.viralScore != null ? Math.round(parseFloat(v.viralScore) * 10) : null,
      viralityScoreExplanation: v.viralReason ?? null,
      // videoMsDuration is milliseconds — convert to seconds
      duration: v.videoMsDuration != null ? Math.round(v.videoMsDuration / 1000) : null,
      startTime: null,
      endTime: null,
      // Vizard URLs are temporary (7 days) — fetched live via getClipUrls
      clipUrl: null,
    }));
}

async function getClipUrls(
  providerProjectId: string,
): Promise<Map<string, string>> {
  const res = await vizardRequest<VizardQueryResponse>(
    `/query/${encodeURIComponent(providerProjectId)}`,
  );

  const map = new Map<string, string>();
  if (res.code !== 2000 || !res.data?.videos?.length) return map;

  for (const v of res.data.videos) {
    if (v.videoUrl) map.set(String(v.videoId), v.videoUrl);
  }

  return map;
}

export const vizardProvider: ClipProvider = {
  createProject,
  getProjectStatus,
  getClips,
  getClipUrls,
};
