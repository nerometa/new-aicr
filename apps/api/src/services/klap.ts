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

// Check if API key is configured
export const isKlapConfigured = (): boolean => {
  return !!KEY && KEY.length > 0;
};

const headers = () => ({
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
});

export const klapPost = async <T = unknown>(path: string, body: object): Promise<T> => {
  if (!isKlapConfigured()) {
    throw new Error('KLAP_API_KEY is not configured. Please add it to your .env file.');
  }
  
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Klap API Error [${path}]:`, res.status, errorText);
    throw new Error(`Klap API error: ${res.status} - ${errorText}`);
  }
  
  return res.json() as Promise<T>;
};

export const klapGet = async <T = unknown>(path: string): Promise<T> => {
  if (!isKlapConfigured()) {
    throw new Error('KLAP_API_KEY is not configured. Please add it to your .env file.');
  }
  
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Klap API Error [${path}]:`, res.status, errorText);
    throw new Error(`Klap API error: ${res.status} - ${errorText}`);
  }
  
  return res.json() as Promise<T>;
};

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
