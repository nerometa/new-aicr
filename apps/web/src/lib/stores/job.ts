import { writable, get } from 'svelte/store';
import type { Job, ClipResponse, JobStatus } from '@aicr/shared';
import { getJob, getClips, API_BASE } from '$lib/api';

interface JobStore {
  job: Job | null;
  clips: ClipResponse[];
  status: JobStatus | 'pending';
  error: string | null;
  eventSource: EventSource | null;
}

const initialState: JobStore = {
  job: null,
  clips: [],
  status: 'pending',
  error: null,
  eventSource: null,
};

const state = writable<JobStore>(initialState);

async function loadJob(jobId: string) {
  try {
    const job = await getJob(jobId);
    state.update(s => ({ ...s, job, status: job.status }));
    
    if (job.status === 'ready') {
      await loadClips(jobId);
    }
  } catch (error) {
    console.error('Failed to load job:', error);
    state.update(s => ({ ...s, status: 'error', error: (error as Error).message }));
  }
}

async function loadClips(jobId: string) {
  try {
    const clips = await getClips(jobId);
    const sorted = clips.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
    state.update(s => ({ ...s, clips: sorted }));
  } catch (error) {
    console.error('Failed to load clips:', error);
  }
}

function subscribeToSSE(jobId: string) {
  disconnect();
  
  const eventSource = new EventSource(`${API_BASE}/api/jobs/sse/${jobId}`);
  state.update(s => ({ ...s, eventSource }));
  
  eventSource.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const newStatus = data.status;
    
    state.update(s => ({ ...s, status: newStatus }));
    
    if (newStatus === 'ready' || newStatus === 'error') {
      disconnect();
      
      if (newStatus === 'ready') {
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
  const current = get(state);
  if (current.eventSource) {
    current.eventSource.close();
    state.update(s => ({ ...s, eventSource: null }));
  }
}

async function initializeJob(jobId: string) {
  await loadJob(jobId);
  subscribeToSSE(jobId);
}

function updateClip(clipId: string, updates: Partial<ClipResponse>) {
  state.update(s => {
    const clipIndex = s.clips.findIndex(c => c.id === clipId);
    if (clipIndex !== -1) {
      const newClips = [...s.clips];
      newClips[clipIndex] = { ...newClips[clipIndex]!, ...updates };
      return { ...s, clips: newClips };
    }
    return s;
  });
}

// Export flow removed — Reap provides clipUrl directly on ClipResponse.
// No separate export step needed.

function clear() {
  disconnect();
  state.set(initialState);
}

export const jobStore = {
  subscribe: state.subscribe,
  get job() {
    return get(state).job;
  },
  get clips() {
    return get(state).clips;
  },
  get status() {
    return get(state).status;
  },
  get error() {
    return get(state).error;
  },
  get isConnected() {
    return get(state).eventSource !== null;
  },
  initializeJob,
  loadJob,
  loadClips,
  subscribeToSSE,
  disconnect,
  updateClip,
  clear,
};
