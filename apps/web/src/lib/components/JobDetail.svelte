<script lang="ts">
  import { viewStore } from '$lib/stores/view';
  import { jobStore } from '$lib/stores/job';
  import { API_BASE } from '$lib/api';
  import ClipCard from './ClipCard.svelte';

  export let id: string;

  let loading = true;
  let exportingClipId: string | null = null;

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

  $: videoId = getYouTubeVideoId(id);
  $: thumbnail = videoId ? getYouTubeThumbnail(`https://youtube.com/watch?v=${videoId}`) : null;

  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  onMount(() => {
    jobStore.subscribeToJob(id);
  });

  async function handleExport(clipId: string) {
    exportingClipId = clipId;
    try {
      const res = await fetch(`${API_BASE}/api/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId }),
      });
      if (!res.ok) throw new Error('Export failed');
      toast.success('Export started! We\'ll notify you when ready.');
    } catch (e) {
      toast.error('Failed to start export');
    } finally {
      exportingClipId = null;
    }
  }
</script>

{#if $jobStore.job}
  <!-- Job Header with Thumbnail -->
  <div class="mb-8">
    {#if thumbnail}
      <div class="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-[var(--border)]">
        <img src={thumbnail} alt="Video thumbnail" class="w-full h-full object-cover" />
      </div>
    {/if}
    <p class="text-xs text-[var(--muted)] break-all">{$jobStore.job.youtubeUrl}</p>
  </div>

  <!-- Status indicator (no duplicate raw text) -->
  <div class="border border-[var(--border)] rounded-lg p-4 mb-8 flex items-center gap-4 bg-[var(--bg)]">
    {#if $jobStore.status === 'processing'}
      <span class="text-xs tracking-widest text-[var(--muted)] uppercase font-semibold">Status</span>
      <span class="font-bold uppercase text-sm text-yellow-500">Processing</span>
      <span class="text-xs text-[var(--muted)] animate-pulse">Klap is analyzing your video... this can take a few minutes.</span>
    {:else if $jobStore.status === 'error'}
      <span class="text-xs tracking-widest text-[var(--muted)] uppercase font-semibold">Status</span>
      <span class="font-bold uppercase text-sm text-red-500">Error</span>
      <span class="text-xs text-red-500">{$jobStore.error || 'Processing failed'}</span>
    {:else if $jobStore.status === 'ready'}
      <span class="text-xs tracking-widest text-[var(--muted)] uppercase font-semibold">Status</span>
      <span class="font-bold uppercase text-sm text-green-500">Ready</span>
      <span class="px-3 py-1 text-xs rounded-full bg-[var(--accent)] text-white font-bold">Ready</span>
    {:else}
      <span class="text-xs tracking-widest text-[var(--muted)] uppercase font-semibold">Status</span>
      <span class="font-bold uppercase text-sm text-[var(--fg)]">{$jobStore.status}</span>
    {/if}
  </div>

  <!-- Clips grid -->
  {#if $jobStore.clips.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each $jobStore.clips as clip (clip.id)}
        <ClipCard clip={clip} onExport={handleExport} {exportingClipId} />
      {/each}
    </div>
  {:else if $jobStore.status === 'ready'}
    <div class="text-center p-8 border border-dashed border-[var(--border)] rounded-lg">
      <p class="text-[var(--muted)]">No clips found for this job.</p>
    </div>
  {/if}
{:else}
  <div class="flex items-center justify-center p-8">
    <span class="text-[var(--muted)] animate-pulse">Loading job...</span>
  </div>
{/if}
