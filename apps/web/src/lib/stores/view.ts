export type ViewState = 'landing' | 'job' | 'jobs-list';

interface ViewStore {
  current: ViewState;
  showAuthModal: boolean;
  jobsListVisible: boolean;
}

let state = $state<ViewStore>({
  current: 'landing',
  showAuthModal: false,
  jobsListVisible: true,
});

function navigate(view: ViewState, jobId?: string) {
  state.current = view;
  
  let url = '/';
  if (view === 'job' && jobId) {
    url = `/?job=${jobId}`;
  } else if (view === 'jobs-list') {
    url = '/?view=jobs';
  }
  
  history.pushState({ view, jobId }, '', url);
}

function openAuthModal() {
  state.showAuthModal = true;
}

function closeAuthModal() {
  state.showAuthModal = false;
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
  state.jobsListVisible = !state.jobsListVisible;
}

export const viewStore = {
  get current() {
    return state.current;
  },
  get showAuthModal() {
    return state.showAuthModal;
  },
  get jobsListVisible() {
    return state.jobsListVisible;
  },
  navigate,
  openAuthModal,
  closeAuthModal,
  toLanding,
  toJob,
  toJobsList,
  toggleJobsList,
};
