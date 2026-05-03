<script>
// @ts-nocheck
  import ExperimentSetup from '$lib/components/ExperimentSetup.svelte';
  import { API_BASE } from '$lib/api';
  // Data loaded by +page.ts
  export let data;
  $: experiments = data?.experiments ?? [];
  let showSetup = false;

  const sectionFor = (status) => {
    switch (status) {
      case 'pending':
        return 'Setup';
      case 'processing':
        return 'Running';
      case 'ready':
        return 'Results';
      default:
        return 'Other';
    }
  };

  const badgeClasses = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  async function exportCsv(experimentId, experimentName) {
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
      alert('Failed to export. Make sure you are logged in.');
    }
  }
</script>

<div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-2xl font-semibold">Experiments</h1>
    <button 
      on:click={() => showSetup = !showSetup}
      class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
    >
      {showSetup ? 'Cancel' : 'Create New Experiment'}
    </button>
  </div>

  {#if showSetup}
    <div class="mb-10">
      <ExperimentSetup />
    </div>
  {/if}

  
  <section aria-label="Setup" class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Setup</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each experiments.filter(e => e.status === 'pending') as exp}
        <div class="border rounded-lg p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-sm">{exp.name}</div>
            <span class={"px-2 py-1 rounded text-xs " + badgeClasses('pending')}>Pending</span>
          </div>
          <div class="text-xs text-gray-600">{exp.description ?? 'No description'}</div>
        </div>
      {/each}
      {#if experiments.filter(e => e.status === 'pending').length === 0}
        <div class="col-span-1 sm:col-span-2 lg:col-span-3 p-4 border border-dashed rounded-lg text-gray-500">
          No setup experiments
        </div>
      {/if}
    </div>
  </section>

  
  <section aria-label="Running" class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Running</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each experiments.filter(e => e.status === 'processing') as exp}
        <div class="border rounded-lg p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-sm">{exp.name}</div>
            <span class={"px-2 py-1 rounded text-xs " + badgeClasses('processing')}>Processing</span>
          </div>
          <div class="text-xs text-gray-600">{exp.description ?? 'No description'}</div>
        </div>
      {/each}
      {#if experiments.filter(e => e.status === 'processing').length === 0}
        <div class="col-span-1 sm:col-span-2 lg:col-span-3 p-4 border border-dashed rounded-lg text-gray-500">
          No running experiments
        </div>
      {/if}
    </div>
  </section>

  
  <section aria-label="Results" class="mb-10">
    <h2 class="text-xl font-semibold mb-4">Results</h2>
    {#each experiments.filter(e => e.status === 'ready') as exp}
      <div class="border rounded-lg p-4 mb-4 bg-white shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="font-semibold text-sm">{exp.name}</div>
          <div class="flex items-center gap-2">
            <button
              on:click={() => exportCsv(exp.id, exp.name)}
              class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Export CSV
            </button>
            <span class={"px-2 py-1 rounded text-xs " + badgeClasses('ready')}>Ready</span>
          </div>
        </div>
        <div class="text-xs text-gray-600 mb-2">{exp.description ?? 'No description'}</div>
        {#if exp.clips?.length}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {#each exp.clips as clip}
              <a href={clip.url} target="_blank" rel="noreferrer" class="block p-2 border rounded hover:bg-gray-50">
                {clip.title ?? 'Clip'}
              </a>
            {/each}
          </div>
        {:else}
          <div class="text-xs text-gray-500">No clips available</div>
        {/if}
      </div>
    {/each}
    {#if experiments.filter(e => e.status === 'ready').length === 0}
      <div class="p-4 border border-dashed rounded-lg text-gray-500">No completed experiments yet</div>
    {/if}
  </section>
  
</div>
