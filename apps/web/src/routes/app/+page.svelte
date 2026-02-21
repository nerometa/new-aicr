<script lang="ts">
  import { onMount } from 'svelte';
  import { getJobs } from '$lib/api';
  import type { Job } from '@aicr/shared';
  
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
  
  // Klap uses 'ready' not 'done'
  function statusColor(status: string) {
    switch (status) {
      case 'pending': return 'text-[#888]';
      case 'processing': return 'text-[#d4ff00]';
      case 'ready': return 'text-[#4ade80]';
      case 'error': return 'text-[#f87171]';
      default: return 'text-[#888]';
    }
  }
</script>

<div class="p-8">
  <h1 class="font-['Barlow_Condensed'] text-3xl font-black mb-8">YOUR JOBS</h1>
  
  {#if loading}
    <p class="text-[#888] text-sm">Loading...</p>
  {:else if jobs.length === 0}
    <div class="border border-dashed border-[#2a2a2a] p-8 text-center">
      <p class="text-[#888] text-sm mb-4">No jobs yet</p>
      <a href="/" class="text-[#d4ff00] text-xs underline">Create your first job →</a>
    </div>
  {:else}
    <div class="grid gap-4 max-w-4xl">
      {#each jobs as job}
        <a
          href="/app/job/{job.id}"
          class="border border-[#2a2a2a] p-4 hover:border-[#d4ff00] transition-colors flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm mb-1 break-all">{job.youtubeUrl}</p>
            <p class="text-xs text-[#888]">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</p>
          </div>
          <span class="text-xs font-bold uppercase {statusColor(job.status)} shrink-0">{job.status}</span>
        </a>
      {/each}
    </div>
  {/if}
</div>
