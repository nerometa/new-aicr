<script lang="ts">
  import { onMount } from 'svelte';
  import { getJobs } from '$lib/api';
  import type { Job } from '@aicr/shared';
  import { viewStore } from '$lib/stores/view';

  let jobs = $state<Job[]>([]);
  let loading = $state(true);

  // Extract YouTube video ID from URL
  function getYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s/?#]+)/);
    return match ? match[1] : null;
  }

  // Get YouTube thumbnail URL
  function getYouTubeThumbnail(url: string): string | null {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  }

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
        return 'text-gray-400 border-gray-400';
      case 'processing':
        return 'text-yellow-500 border-yellow-500';
      case 'ready':
        return 'text-green-500 border-green-500';
      case 'error':
        return 'text-red-500 border-red-500';
      default:
        return 'text-gray-400 border-gray-400';
    }
  }
</script>

{#if $viewStore.jobsListVisible}
  <div class="p-3 sm:p-4 border-t border-[var(--border)] mt-6 sm:mt-8">
    <h2 class="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-[var(--fg)]">Your Jobs</h2>
    {#if loading}
      <p class="text-sm text-[var(--muted)]">Loading...</p>
    {:else if jobs.length === 0}
      <div class="text-center p-6 sm:p-8 border border-dashed border-[var(--border)] rounded-lg">
        <p class="text-sm text-[var(--muted)] mb-2">No jobs yet.</p>
        <a href="/" class="text-sm text-[var(--accent)] hover:underline">Create one</a>
      </div>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each jobs as job}
          {@const thumbnail = getYouTubeThumbnail(job.youtubeUrl)}
          <button
            onclick={() => viewStore.toJob(job.id)}
            class="block p-2 sm:p-3 rounded-xl hover:bg-[var(--bg)] border border-[var(--border)] shadow-sm transition-all text-left overflow-hidden"
          >
            {#if thumbnail}
              <div class="relative w-full aspect-video rounded-lg overflow-hidden mb-2 bg-[var(--border)]">
                <img src={thumbnail} alt="Video thumbnail" class="w-full h-full object-cover" />
              </div>
            {/if}
            <div class="flex justify-between items-start mb-1">
              <p class="text-xs sm:text-sm truncate font-semibold flex-1 mr-2 text-[var(--fg)] line-clamp-1">{job.youtubeUrl}</p>
              <span class={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-bold uppercase ${statusColor(job.status)}`}>{job.status}</span>
            </div>
            <p class="text-[8px] sm:text-[10px] text-[var(--muted)]">
              {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}
            </p>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
