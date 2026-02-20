/**
 * API Client for AICR Backend
 * 
 * VITE_API_URL: The public URL of the backend API server.
 * - Example: https://api.aicr.example.com or http://localhost:3000
 * - Must be set at build time (baked into the bundle)
 */
import type { Job, Clip, JobResponse, CreateJobRequest, ExportResponse } from '@aicr/shared';

// API base URL - VITE_API_URL must be set at build time
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

// Jobs
export const createJob = (youtubeUrl: string) =>
  apiFetch<JobResponse>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ youtubeUrl } as CreateJobRequest),
  });

export const getJob = (id: string) =>
  apiFetch<Job>(`/api/jobs/${id}`);

export const getJobs = () =>
  apiFetch<Job[]>('/api/jobs');

// Clips
export const getClips = (jobId: string) =>
  apiFetch<Clip[]>(`/api/clips/${jobId}`);

// Exports
export const createExport = (clipId: string) =>
  apiFetch<{ exportId: string; status: string }>(`/api/exports/${clipId}`, { method: 'POST' });

export const getExport = (clipId: string, exportId: string) =>
  apiFetch<ExportResponse>(`/api/exports/${clipId}/${exportId}`);
