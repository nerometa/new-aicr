// Shared types for AICR
// Status values match Klap API: "processing" | "ready" | "error"

export type JobStatus = 'pending' | 'processing' | 'ready' | 'error';
export type ExportStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface Job {
  id: string;
  userId: string | null; // null for anonymous jobs
  youtubeUrl: string;
  klapTaskId: string | null;
  klapFolderId: string | null;
  status: JobStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clip {
  id: string;
  jobId: string;
  klapFolderId: string;
  name: string | null;
  viralityScore: number | null;
  viralityScoreExplanation: string | null;
  previewUrl: string | null;
  embedUrl: string | null;
  exportStatus: ExportStatus | null;
  exportUrl: string | null;
  createdAt: Date;
}

export interface CreateJobRequest {
  youtubeUrl: string;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  youtubeUrl: string;
}

export interface ClipResponse {
  id: string;
  jobId: string;
  name: string | null;
  viralityScore: number | null;
  previewUrl: string | null;
  embedUrl: string | null;
  exportStatus: ExportStatus | null;
  exportUrl: string | null;
}

export interface ExportResponse {
  exportId: string;
  status: ExportStatus;
  exportUrl?: string;
}

export interface SSEResponse {
  status: JobStatus;
  jobId: string;
}
