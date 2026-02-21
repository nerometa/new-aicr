import { writable, get } from 'svelte/store';

export type ViewState = 'landing' | 'job' | 'jobs-list';

interface ViewStore {
  current: ViewState;
  activeJobId: string | null;
  showAuthModal: boolean;
  jobsListVisible: boolean;
}

const initialState: ViewStore = {
  current: 'landing',
  activeJobId: null,
  showAuthModal: false,
  jobsListVisible: true,
};

const state = writable<ViewStore>(initialState);

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    if (event.state) {
      state.update(s => ({ ...s, current: event.state.view, activeJobId: event.state.jobId || null }));
    }
  });
}

function navigate(view: ViewState, jobId?: string) {
  state.update(s => ({ ...s, current: view, activeJobId: jobId || null }));
  
  let url = '/';
  if (view === 'job' && jobId) {
    url = `/?job=${jobId}`;
  } else if (view === 'jobs-list') {
    url = '/?view=jobs';
  }
  
  history.pushState({ view, jobId }, '', url);
}

function openAuthModal() {
  state.update(s => ({ ...s, showAuthModal: true }));
}

function closeAuthModal() {
  state.update(s => ({ ...s, showAuthModal: false }));
}

function toLanding() {
  navigate('landing');
}

function toJob(jobId: string) {
  navigate('job', jobId);
}

function toJobsList() {
  navigate('jobs-list');
}

function toggleJobsList() {
  state.update(s => ({ ...s, jobsListVisible: !s.jobsListVisible }));
}

export const viewStore = {
  subscribe: state.subscribe,
  get current() {
    return get(state).current;
  },
  get activeJobId() {
    return get(state).activeJobId;
  },
  get showAuthModal() {
    return get(state).showAuthModal;
  },
  get jobsListVisible() {
    return get(state).jobsListVisible;
  },
  navigate,
  openAuthModal,
  closeAuthModal,
  toLanding,
  toJob,
  toJobsList,
  toggleJobsList,
};
