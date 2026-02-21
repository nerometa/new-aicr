import type { Job, Clip, JobStatus } from '@aicr/shared';
import { getJob, getClips, createExport, getExport, API_BASE } from '$lib/api';

interface JobStore {
  job: Job | null;
  clips: Clip[];
  status: JobStatus | 'pending';
  error: string | null;
  eventSource: EventSource | null;
}

let state = $state<JobStore>({
  job: null,
  clips: [],
  status: 'pending',
  error: null,
  eventSource: null,
});

async function loadJob(jobId: string) {
  try {
    const job = await getJob(jobId);
    state.job = job;
    state.status = job.status;
    
    if (state.status === 'ready') {
      await loadClips(jobId);
    }
  } catch (error) {
    console.error('Failed to load job:', error);
    state.status = 'error';
    state.error = (error as Error).message;
  }
}

async function loadClips(jobId: string) {
  try {
    const clips = await getClips(jobId);
    state.clips = clips.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
  } catch (error) {
    console.error('Failed to load clips:', error);
  }
}

function subscribeToSSE(jobId: string) {
  disconnect();
  
  const eventSource = new EventSource(`${API_BASE}/api/jobs/sse/${jobId}`);
  state.eventSource = eventSource;
  
  eventSource.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    state.status = data.status;
    
    if (state.status === 'ready' || state.status === 'error') {
      disconnect();
      
      if (state.status === 'ready') {
        await loadClips(jobId);
      }
    }
  };
  
  eventSource.onerror = () => {
    console.error('SSE connection error');
    disconnect();
  };
}

function disconnect() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
}

async function initializeJob(jobId: string) {
  await loadJob(jobId);
  subscribeToSSE(jobId);
}

function updateClip(clipId: string, updates: Partial<Clip>) {
  const clipIndex = state.clips.findIndex(c => c.id === clipId);
  if (clipIndex !== -1) {
    state.clips[clipIndex] = { ...state.clips[clipIndex], ...updates };
  }
}

async function exportClip(clipId: string) {
  updateClip(clipId, { exportStatus: 'processing' });

  try {
    const { exportId } = await createExport(clipId);

    const poll = setInterval(async () => {
      try {
        const result = await getExport(clipId, exportId);
        if (result.status === 'ready' && result.exportUrl) {
          updateClip(clipId, { exportUrl: result.exportUrl, exportStatus: 'ready' });
          clearInterval(poll);
          // Consider auto-downloading or showing a notification
        } else if (result.status === 'error') {
          updateClip(clipId, { exportStatus: 'error' });
          clearInterval(poll);
        }
      } catch (e) {
        updateClip(clipId, { exportStatus: 'error' });
        clearInterval(poll);
      }
    }, 5000);
  } catch (e) {
    updateClip(clipId, { exportStatus: 'error' });
  }
}

function clear() {
  disconnect();
  state.job = null;
  state.clips = [];
  state.status = 'pending';
}

export const jobStore = {
  get job() {
    return state.job;
  },
  get clips() {
    return state.clips;
  },
  get status() {
    return state.status;
  },
  get error() {
    return state.error;
  },
  get isConnected() {
    return state.eventSource !== null;
  },
  initializeJob,
  loadJob,
  loadClips,
  subscribeToSSE,
  disconnect,
  updateClip,
  exportClip,
  clear,
};
