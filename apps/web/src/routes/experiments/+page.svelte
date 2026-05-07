<script lang="ts">
  import ExperimentSetup from '$lib/components/ExperimentSetup.svelte';
  import { API_BASE } from '$lib/api';
  import { toast } from '$lib/toast';

  export let data;
  type ExperimentStatus = 'pending' | 'processing' | 'ready' | 'error';

  type Experiment = {
    id: string;
    name: string;
    description?: string | null;
    status: ExperimentStatus;
    sourceVideoUrl: string;
    createdAt: string;
  };

  let experiments: Experiment[] = data?.experiments ?? [];
  let showSetup = false;
  let refreshing = false;

  const sections = [
    {
      status: 'pending',
      title: 'Setup',
      description: 'Experiments queued for processing.',
      emptyLabel: 'No pending experiments',
    },
    {
      status: 'processing',
      title: 'Running',
      description: 'Jobs currently being processed.',
      emptyLabel: 'No experiments running',
    },
    {
      status: 'ready',
      title: 'Results',
      description: 'Completed experiments with clips to review.',
      emptyLabel: 'No completed experiments yet',
    },
    {
      status: 'error',
      title: 'Errors',
      description: 'Experiments that failed to start.',
      emptyLabel: 'No experiments in error state',
    },
  ];

  const badgePalette = {
    pending: 'bg-[var(--border)] text-[var(--muted)]',
    processing: 'bg-[var(--bg)] text-[var(--accent)] border border-[var(--border)]',
    ready: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30',
    error: 'bg-red-50 text-red-600 border border-red-100',
  };

  const badgeClasses = (status: string) => {
    return badgePalette[status as keyof typeof badgePalette] ??
      'bg-[var(--border)] text-[var(--muted)]';
  };

  const sectionItems = (status: string) => experiments.filter((exp) => exp.status === status);

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      return value;
    }
  };

  async function refreshExperiments() {
    refreshing = true;
    try {
      const response = await fetch(`${API_BASE}/api/experiments`, { credentials: 'include' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to refresh experiments');
      }
      experiments = await response.json();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to refresh experiments');
    } finally {
      refreshing = false;
    }
  }

  async function exportCsv(experimentId: string, experimentName: string) {
    try {
      const response = await fetch(`${API_BASE}/api/experiments/${experimentId}/export`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${experimentName.replace(/[^a-z0-9]/gi, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export. Make sure you are logged in.');
    }
  }
</script>

  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
    <section class="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
      <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="space-y-4">
          <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Experiments overview</p>
          <h1 class="text-3xl font-semibold text-[var(--fg)]">Organize clips with clarity</h1>
          <p class="text-sm text-[var(--muted)]">
            AICR keeps every AI clipping test within reach — set up new variants, monitor status, and download the clips you need.
          </p>
          <div class="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {#each sections as section}
              <span class="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1">
                {section.title}: {sectionItems(section.status).length}
              </span>
            {/each}
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each sections as section}
            <article class="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                <span>{section.title}</span>
                <span class={"px-3 py-1 text-xs font-semibold rounded-full " + badgeClasses(section.status)}>
                  {section.status}
                </span>
              </div>
              <p class="text-3xl font-bold text-[var(--accent)] mt-3">{sectionItems(section.status).length}</p>
              <p class="text-xs text-[var(--muted)] mt-2">{section.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:flex-row md:items-center md:justify-between md:gap-6">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-[var(--fg)]">Total experiments</p>
        <p class="text-3xl font-bold text-[var(--accent)]">{experiments.length}</p>
        <p class="text-xs text-[var(--muted)]">Refine what matters. No noise, no surprises.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          on:click={refreshExperiments}
          class="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--fg)] transition-colors duration-150 hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:opacity-60 disabled:pointer-events-none"
          aria-label="Refresh experiments list"
          aria-busy={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          on:click={() => (showSetup = !showSetup)}
          class="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent)]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
          aria-expanded={showSetup}
          aria-controls="experiment-setup-panel"
        >
          {showSetup ? 'Hide form' : 'Create new experiment'}
        </button>
      </div>
    </section>

    {#if showSetup}
      <div id="experiment-setup-panel" class="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <ExperimentSetup on:created={refreshExperiments} />
      </div>
    {/if}

    {#if refreshing}
      <div role="status" aria-live="polite" class="text-xs text-[var(--accent)]">
        Refreshing experiments…
      </div>
    {/if}

    <div class="space-y-6">
      {#each sections as section}
        <section
          class="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"
          aria-labelledby={`section-${section.status}`}
        >
          <div class="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <h2 id={`section-${section.status}`} class="text-xl font-semibold text-[var(--fg)]">{section.title}</h2>
              <p class="text-xs text-[var(--muted)]">{section.description}</p>
            </div>
            <span class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{sectionItems(section.status).length} total</span>
          </div>
          {#if sectionItems(section.status).length}
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              {#each sectionItems(section.status) as exp (exp.id)}
                <article
                  class="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition-colors duration-150 hover:border-[var(--accent)]/60"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-[var(--fg)]">{exp.name}</p>
                      <p class="text-xs text-[var(--muted)]">{exp.description ?? 'No description yet'}</p>
                    </div>
                    <span class={"px-3 py-1 text-xs font-semibold rounded-full " + badgeClasses(exp.status)}>
                      {exp.status}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--muted)]">
                    Video:
                    <a
                      href={exp.sourceVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      class="underline text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                      aria-label={`Open source video for ${exp.name}`}
                    >
                      Open video
                    </a>
                  </p>
                  <p class="text-xs text-[var(--muted)]">Created {formatDate(exp.createdAt)}</p>
                  {#if exp.status === 'ready'}
                    <button
                      type="button"
                      on:click={() => exportCsv(exp.id, exp.name)}
                      class="inline-flex items-center gap-1 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                      aria-label={`Export clips for ${exp.name} as CSV`}
                    >
                      Export CSV
                    </button>
                  {/if}
                </article>
              {/each}
            </div>
          {:else}
            <div class="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted)]">
              {section.emptyLabel}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  </div>
