<script lang="ts">
  import ExperimentSetup from '$lib/components/ExperimentSetup.svelte';
  import { API_BASE } from '$lib/api';
  import { toast } from '$lib/toast';

  export let data;
  let experiments = data?.experiments ?? [];
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

  const badgeClasses = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-200 text-gray-700';
    }
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

<div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-2xl font-semibold">Experiments</h1>
      <p class="text-sm text-gray-600">Owner-only dashboard for Klap multi-configuration tests.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        on:click={refreshExperiments}
        class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        disabled={refreshing}
      >
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
      <button
        type="button"
        on:click={() => (showSetup = !showSetup)}
        class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
      >
        {showSetup ? 'Hide form' : 'Create New Experiment'}
      </button>
    </div>
  </div>

  {#if showSetup}
    <div class="mb-8">
      <ExperimentSetup on:created={refreshExperiments} />
    </div>
  {/if}

  {#if refreshing}
    <div class="text-xs text-blue-600">Refreshing experiments…</div>
  {/if}

  {#each sections as section}
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold">{section.title}</h2>
          <p class="text-sm text-gray-500">{section.description}</p>
        </div>
        <span class="text-xs text-gray-500">{sectionItems(section.status).length} total</span>
      </div>
      {#if sectionItems(section.status).length}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each sectionItems(section.status) as exp (exp.id)}
            <article class="border rounded-xl p-4 bg-white shadow-sm space-y-2">
              <div class="flex items-baseline justify-between gap-3">
                <div>
                  <p class="font-semibold text-sm">{exp.name}</p>
                  <p class="text-xs text-gray-500">{exp.description ?? 'No description'}</p>
                </div>
                <span class={"px-2 py-1 rounded-full text-xs font-semibold " + badgeClasses(exp.status)}>
                  {exp.status}
                </span>
              </div>
              <p class="text-xs text-gray-500">
                Video: <a href={exp.sourceVideoUrl} target="_blank" rel="noreferrer" class="underline">Link</a>
              </p>
              <p class="text-xs text-gray-500">Created {formatDate(exp.createdAt)}</p>
              {#if exp.status === 'ready'}
                <button
                  type="button"
                  on:click={() => exportCsv(exp.id, exp.name)}
                  class="mt-2 inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Export CSV
                </button>
              {/if}
            </article>
          {/each}
        </div>
      {:else}
        <div class="p-4 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500">
          {section.emptyLabel}
        </div>
      {/if}
    </section>
  {/each}
</div>
