<script lang="ts">
  import { onMount } from 'svelte';
  import { getJobs } from '$lib/api';
  import type { Job } from '@aicr/shared';
  import { viewStore } from '$lib/stores/view';

  let jobs = $state<Job[]>([]);
  let jobTitles = $state<Record<string, string>>({});
  let loading = $state(true);

  // Relative time formatter
  const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

  function getTime(value: Date | string | undefined | null): number | null {
    const time = value instanceof Date ? value.getTime() : new Date(value ?? '').getTime();
    return Number.isFinite(time) ? time : null;
  }

  function timeAgo(date: Date | string | undefined | null): string {
    const then = getTime(date);
    if (then === null) return '';

    const now = Date.now();
    const seconds = Math.round((then - now) / 1000);
    const absSeconds = Math.abs(seconds);

    if (absSeconds < 60) return rtf?.format(seconds, 'second') ?? 'just now';
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return rtf?.format(minutes, 'minute') ?? `${absSeconds}s ago`;
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf?.format(hours, 'hour') ?? `${absSeconds}s ago`;
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf?.format(days, 'day') ?? `${absSeconds}s ago`;
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf?.format(months, 'month') ?? `${absSeconds}s ago`;
    const years = Math.round(months / 12);
    return rtf?.format(years, 'year') ?? `${absSeconds}s ago`;
  }

  // Extract YouTube video ID from URL - supports multiple formats
  function getYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?!\w)/);
    return match ? match[1] : null;
  }

  // Get YouTube thumbnail URL
  function getYouTubeThumbnail(url: string): string | null {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  }

  // Fetch YouTube video title using oEmbed API
  async function fetchYouTubeTitle(url: string): Promise<string> {
    try {
      const videoId = getYouTubeVideoId(url);
      if (!videoId) return url;
      
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (!res.ok) return url;
      
      const data = await res.json();
      return data.title || url;
    } catch {
      return url;
    }
  }

  onMount(async () => {
    try {
      jobs = (await getJobs()).sort(
        (a, b) => (getTime(b.createdAt) ?? 0) - (getTime(a.createdAt) ?? 0)
      );
      
      // Fetch titles for all jobs in parallel
      const titlePromises = jobs.map(async (job) => {
        const title = await fetchYouTubeTitle(job.youtubeUrl);
        return [job.id, title] as const;
      });
      
      const titles = await Promise.all(titlePromises);
      jobTitles = Object.fromEntries(titles);
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
            class="group cursor-pointer block p-2 sm:p-3 rounded-xl hover:bg-[var(--bg)] hover:shadow-md hover:border-[var(--accent)] border border-[var(--border)] shadow-sm transition-all text-left overflow-hidden"
          >
            {#if thumbnail}
              <div class="relative w-full aspect-video rounded-lg overflow-hidden mb-2 bg-[var(--border)]">
                <img src={thumbnail} alt="Video thumbnail" class="w-full h-full object-cover" />
              </div>
            {/if}
            <div class="flex justify-between items-start mb-1">
              <p class="text-xs sm:text-sm truncate font-semibold flex-1 mr-2 text-[var(--fg)] line-clamp-2">{jobTitles[job.id] || job.youtubeUrl}</p>
              <span class={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-bold uppercase ${statusColor(job.status)}`}>{job.status}</span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <p class="text-[8px] sm:text-[10px] text-[var(--muted)]">
                {timeAgo(job.createdAt)}
              </p>
              {#if job.provider}
                <span class="text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted)] font-mono uppercase">{job.provider}</span>
              {/if}
            </div>
            <div class="mt-2 flex items-center justify-end">
              <span class="text-[10px] sm:text-xs text-[var(--accent)] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                View clips
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 sm:w-4 sm:h-4">
                  <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
