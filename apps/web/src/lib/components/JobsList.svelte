<script lang="ts">
  import { onMount } from 'svelte';
  import { getJobs } from '$lib/api';
  import type { Job } from '@aicr/shared';
  import { viewStore } from '$lib/stores/view';

  let jobs = $state<Job[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      jobs = await getJobs();
    } catch (e) {
      console.error('Failed to load jobs', e);
    } finally {
      loading = false;
    }
  });

  function statusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'processing':
        return 'text-yellow-400';
      case 'ready':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }
</script>

{#if viewStore.jobsListVisible}
  <div class="p-4 border-r border-[var(--border)] h-full overflow-y-auto">
    <h2 class="text-lg font-bold mb-4">Jobs</h2>
    {#if loading}
      <p class="text-sm text-[var(--muted)]">Loading...</p>
    {:else if jobs.length === 0}
      <div class="text-center p-8 border border-dashed border-[var(--border)] rounded-lg">
        <p class="text-sm text-[var(--muted)] mb-2">No jobs yet.</p>
        <a href="/" class="text-sm text-[var(--accent)] hover:underline">Create one</a>
      </div>
    {:else}
      <div class="grid gap-2">
        {#each jobs as job}
          <a
            href={`/app/job/${job.id}`}
            class="block p-3 rounded-lg hover:bg-[var(--bg)] border border-transparent hover:border-[var(--border)] transition-colors"
          >
            <div class="flex justify-between items-center">
              <p class="text-sm truncate font-semibold">{job.youtubeUrl}</p>
              <span class={`text-xs font-bold uppercase ${statusColor(job.status)}`}>{job.status}</span>
            </div>
            <p class="text-xs text-[var(--muted)] mt-1">
              {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}
            </p>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
