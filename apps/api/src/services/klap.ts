import { env } from '../env';

const BASE = env.KLAP_API_URL;
const KEY = env.KLAP_API_KEY;

// Klap API Types
export interface KlapTask {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  output_id?: string;
  error?: string;
}

export interface KlapProject {
  id: string;
  name: string;
  virality_score: number;
}

export interface KlapExport {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  src_url?: string;
}

export const isKlapConfigured = (): boolean => !!KEY && KEY.length > 0;

// Unified request function - eliminates duplication between klapGet/klapPost
async function klapRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!isKlapConfigured()) {
    throw new Error('KLAP_API_KEY is not configured. Please add it to your .env file.');
  }

  const url = `${BASE}${path}`;
  console.log(`[Klap] ${options?.method || 'GET'} ${url}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Klap] Error ${res.status}:`, errorText);
      throw new Error(`Klap API error: ${res.status} - ${errorText}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    // Provide more helpful error message for network issues
    if (error instanceof TypeError && (error as Error).message.includes('FailedToOpenSocket')) {
      console.error(`[Klap] Network error - cannot reach ${url}`);
      console.error('[Klap] This may be a DNS or firewall issue in Docker');
      throw new Error(`Cannot reach Klap API at ${url}. Check DNS resolution and network access.`);
    }
    throw error;
  }
}

export const klapGet = <T>(path: string): Promise<T> => klapRequest<T>(path);

export const klapPost = <T>(path: string, body: object): Promise<T> =>
  klapRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const createVideoTask = (sourceUrl: string): Promise<KlapTask> =>
  klapPost<KlapTask>('/tasks/video-to-shorts', {
    source_video_url: sourceUrl,
    language: 'en',
    max_duration: env.KLAP_MAX_DURATION,
    max_clip_count: env.KLAP_MAX_CLIP_COUNT,
    editing_options: { intro_title: false },
  });

export const getTask = (taskId: string): Promise<KlapTask> => 
  klapGet<KlapTask>(`/tasks/${taskId}`);

export const getProjects = (folderId: string): Promise<KlapProject[]> => 
  klapGet<KlapProject[]>(`/projects/${folderId}`);

export const createExport = (folderId: string, projectId: string): Promise<KlapExport> =>
  klapPost<KlapExport>(`/projects/${folderId}/${projectId}/exports`, {});

export const getExport = (folderId: string, projectId: string, exportId: string): Promise<KlapExport> =>
  klapGet<KlapExport>(`/projects/${folderId}/${projectId}/exports/${exportId}`);

export const previewUrl = (projectId: string) =>
  `https://klap.app/player/${projectId}`;
