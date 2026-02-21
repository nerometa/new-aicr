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
        return 'text-yellow-500';
      case 'ready':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  }
</script>

{#if $viewStore.jobsListVisible}
  <div class="p-4 border-t border-[var(--border)] mt-8">
    <h2 class="text-lg font-bold mb-4 text-[var(--fg)]">Your Jobs</h2>
    {#if loading}
      <p class="text-sm text-[var(--muted)]">Loading...</p>
    {:else if jobs.length === 0}
      <div class="text-center p-8 border border-dashed border-[var(--border)] rounded-lg">
        <p class="text-sm text-[var(--muted)] mb-2">No jobs yet.</p>
        <a href="/" class="text-sm text-[var(--accent)] hover:underline">Create one</a>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each jobs as job}
          <button
            onclick={() => viewStore.toJob(job.id)}
            class="block p-4 rounded-xl hover:bg-[var(--bg)] border border-[var(--border)] shadow-sm transition-all text-left"
          >
            <div class="flex justify-between items-start mb-2">
              <p class="text-sm truncate font-semibold flex-1 mr-2 text-[var(--fg)]">{job.youtubeUrl}</p>
              <span class={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${statusColor(job.status)}`}>{job.status}</span>
            </div>
            <p class="text-[10px] text-[var(--muted)]">
              {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}
            </p>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
