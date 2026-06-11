/**
 * API Client for AICR Backend
 * 
 * VITE_API_URL: The public URL of the backend API server.
 * - Example: https://api.aicr.example.com or http://localhost:3000
 * - Must be set at build time (baked into the bundle)
 */
import type { Job, ClipResponse, JobResponse, CreateJobRequest } from '@aicr/shared';

// API base URL - VITE_API_URL must be set at build time
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

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
    let message = `API Error: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  
  return res.json();
}

// Jobs
export const createJob = (youtubeUrl: string, provider: 'reap' | 'reka' = 'reap') =>
  apiFetch<JobResponse>('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtubeUrl, provider }),
    credentials: 'include',
  });

export const getJob = (id: string) =>
  apiFetch<Job>(`/api/jobs/${id}`);

export const getJobs = () =>
  apiFetch<Job[]>('/api/jobs');

// Clips
export const getClips = (jobId: string) =>
  apiFetch<ClipResponse[]>(`/api/clips/${jobId}`);

// Export flow removed — Reap provides clipUrl directly. No separate export step.
