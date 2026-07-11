// Shared types for AICR
// Job status: pending -> processing -> ready | error

export type JobStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface Job {
  id: string;
  userId: string | null; // null for anonymous jobs
  youtubeUrl: string;
  providerProjectId: string | null;
  provider: string;
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
  provider: string;
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
  // Flag: true when provider call failed (e.g., project expired)
  urlExpired?: boolean;
}

export interface SSEResponse {
  status: JobStatus;
  jobId: string;
}

export type PlanName = 'free' | 'pro' | 'business';

export interface UsageResponse {
  plan: PlanName;
  jobsThisMonth: number;
  tierLimit: number;
  overageCount: number;
  overageRate: number;
  estimatedTotal: number;
  resetDate: string;
  recentJobs: { id: string; provider: string; createdAt: string; status: string }[];
}

export interface TierUpdateRequest {
  plan: PlanName;
}

export interface TierUpdateResponse {
  plan: PlanName;
}
