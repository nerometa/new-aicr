// Shared types for AICR
// Job status: pending -> processing -> ready | error

export type JobStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface Job {
  id: string;
  userId: string | null; // null for anonymous jobs
  youtubeUrl: string;
  providerProjectId: string | null;
  status: JobStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clip {
  id: string;
  jobId: string;
  providerClipId: string;
  title: string | null;
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  duration: number | null;
  startTime: number | null;
  endTime: number | null;
  createdAt: Date;
}

export interface CreateJobRequest {
  youtubeUrl: string;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  youtubeUrl: string;
  errorMessage?: string | null;
}

export interface ClipResponse {
  id: string;
  jobId: string;
  title: string | null;
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  duration: number | null;
  startTime: number | null;
  endTime: number | null;
  // Ephemeral — fetched live from provider, null when project expired
  clipUrl: string | null;
}

export interface SSEResponse {
  status: JobStatus;
  jobId: string;
}
