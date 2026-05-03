import { env } from '../env';

const BASE = env.KLAP_API_URL;
const KEY = env.KLAP_API_KEY;

// Constants
const KLAP_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds timeout for API requests

// Klap API Types - based on https://docs.klap.app/object-formats
// Task status: "processing" | "ready" | "error"
// Export status: "processing" | "ready" | "error"

export interface KlapTask {
  id: string;
  type: 'video-to-shorts' | 'video-to-video';
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  output_type: 'project' | 'folder';
  output_id?: string;
  error?: string;
}

// New: Managed user and token related types
export interface KlapManagedUser {
  id: string;
}

export interface KlapAccessToken {
  external_access_token: string;
}

export interface KlapProject {
  id: string;
  author_id: string;
  folder_id: string;
  name: string;
  created_at: string;
  virality_score: number;
  virality_score_explanation: string;
}

export interface KlapExport {
  id: string;
  status: 'processing' | 'ready' | 'error';
  src_url: string | null;
  project_id: string;
  created_at: string;
  finished_at: string | null;
  name: string;
  author_id: string;
  folder_id: string;
  descriptions: string;
}

export const isKlapConfigured = (): boolean => !!KEY && KEY.length > 0;

// Unified request function - eliminates duplication between klapGet/klapPost
export async function klapRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!isKlapConfigured()) {
    throw new Error('KLAP_API_KEY is not configured. Please add it to your .env file.');
  }

  const url = `${BASE}${path}`;
  console.log(`[Klap] ${options?.method || 'GET'} ${url}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KLAP_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Klap] Error ${res.status}:`, errorText);
      throw new Error(`Klap API error: ${res.status} - ${errorText}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout
    if (error instanceof Error && (error as Error).name === 'AbortError') {
      console.error(`[Klap] Request timeout after ${KLAP_REQUEST_TIMEOUT_MS}ms`);
      throw new Error(`Klap API request timed out after ${KLAP_REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    
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

export const createVideoTask = (sourceUrl: string, onBehalfOf?: string): Promise<KlapTask> => {
  const body = {
    source_video_url: sourceUrl,
    language: 'en',
    max_duration: env.KLAP_MAX_DURATION,
    max_clip_count: env.KLAP_MAX_CLIP_COUNT,
    editing_options: { intro_title: false },
  };

  const options: any = {
    method: 'POST',
    body: JSON.stringify(body),
  };
  // Optional header to identify the actor on whose behalf the task is created
  if (onBehalfOf) {
    options.headers = {
      'X-On-Behalf-Of': onBehalfOf,
    };
  }

  return klapRequest<KlapTask>('/tasks/video-to-shorts', options);
};

// New: Create a managed user via Klap API
export const createManagedUser = async (): Promise<KlapManagedUser> => {
  return klapPost<KlapManagedUser>('/users', {});
};

// New: Generate access token for a given user
export const generateAccessToken = async (userId: string): Promise<KlapAccessToken> => {
  return klapPost<KlapAccessToken>(`/users/${userId}/tokens`, {});
};

// Helper: build embed URL for Klap projects using a token
export const embedUrl = (projectId: string, token: string): string => {
  return `https://app.klap.app/embed/${projectId}#external_access_token=${token}`;
};

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
