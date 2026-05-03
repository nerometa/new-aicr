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
      description: 'Experiments queued for Klap to spin up.',
      emptyLabel: 'No pending experiments',
    },
    {
      status: 'processing',
      title: 'Running',
      description: 'Jobs currently being processed by Klap.',
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

  const sectionItems = (status: ExperimentStatus) => experiments.filter((exp) => exp.status === status);

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
    <section class="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 space-y-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Experiments overview</p>
        <h1 class="text-3xl font-semibold text-[var(--fg)]">Organize clips with clarity</h1>
        <p class="text-sm text-[var(--muted)]">
          AICR keeps every Klap test within reach — set up new variants, monitor status, and download the clips you need.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each sections as section}
          <div class="rounded-2xl border border-[var(--border)] bg-white/60 p-4">
            <div class="flex items-center justify-between">
              <p class="text-xs uppercase tracking-wide text-[var(--muted)]">{section.title}</p>
              <span class={badgeClasses(section.status)}>{section.status}</span>
            </div>
            <p class="text-2xl font-semibold text-[var(--accent)] mt-2">
              {sectionItems(section.status).length}
            </p>
            <p class="text-xs text-[var(--muted)] mt-1">{section.description}</p>
          </div>
        {/each}
      </div>
    </section>

    <div class="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm font-semibold text-[var(--fg)]">Total experiments</p>
        <p class="text-3xl font-bold text-[var(--accent)]">{experiments.length}</p>
        <p class="text-xs text-[var(--muted)]">Refine what matters. No noise, no surprises.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          on:click={refreshExperiments}
          class="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--border)]"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          on:click={() => (showSetup = !showSetup)}
          class="px-4 py-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/40"
        >
          {showSetup ? 'Hide form' : 'Create new experiment'}
        </button>
      </div>
    </div>

    {#if showSetup}
      <div class="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6">
        <ExperimentSetup on:created={refreshExperiments} />
      </div>
    {/if}

    {#if refreshing}
      <div class="text-xs text-[var(--accent)]">Refreshing experiments…</div>
    {/if}

    <div class="space-y-6">
      {#each sections as section}
        <section class="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <div class="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <h2 class="text-xl font-semibold text-[var(--fg)]">{section.title}</h2>
              <p class="text-xs text-[var(--muted)]">{section.description}</p>
            </div>
            <span class="text-xs text-[var(--muted)]">{sectionItems(section.status).length} total</span>
          </div>
          {#if sectionItems(section.status).length}
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              {#each sectionItems(section.status) as exp (exp.id)}
                <article class="space-y-3 rounded-2xl border border-[var(--border)] bg-white/60 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-[var(--fg)]">{exp.name}</p>
                      <p class="text-xs text-[var(--muted)]">{exp.description ?? 'No description'}</p>
                    </div>
                    <span class={"px-3 py-1 text-xs font-semibold rounded-full " + badgeClasses(exp.status)}>
                      {exp.status}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--muted)]">
                    Video:
                    <a href={exp.sourceVideoUrl} target="_blank" rel="noreferrer" class="underline text-[var(--accent)]">
                      Link
                    </a>
                  </p>
                  <p class="text-xs text-[var(--muted)]">Created {formatDate(exp.createdAt)}</p>
                  {#if exp.status === 'ready'}
                    <button
                      type="button"
                      on:click={() => exportCsv(exp.id, exp.name)}
                      class="inline-flex items-center gap-1 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-1 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20"
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
