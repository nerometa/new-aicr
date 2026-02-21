<script lang="ts">
  import { jobStore } from '$lib/stores/job';
  import ClipCard from './ClipCard.svelte';
  import type { Clip } from '@aicr/shared';

  let { id }: { id: string } = $props();

  $effect(() => {
    if (id) {
      jobStore.initializeJob(id);
    }

    return () => {
      jobStore.clear();
    };
  });

  function handleExport(clip: Clip) {
    jobStore.exportClip(clip.id);
  }
</script>

<div class="p-4 sm:p-6 md:p-8">
  <!-- Status bar -->
  <div class="border border-[var(--border)] rounded-lg p-4 mb-8 flex items-center gap-4 bg-[var(--bg)]">
    <span class="text-xs tracking-widest text-[var(--muted)] uppercase font-semibold">Status</span>
    <span class="font-bold uppercase text-sm text-[var(--fg)]">{$jobStore.status}</span>
    {#if $jobStore.status === 'processing'}
      <span class="text-xs text-[var(--muted)] animate-pulse">Klap is analyzing your video... this can take a few minutes.</span>
    {/if}
    {#if $jobStore.status === 'error'}
      <span class="text-xs text-red-500">{$jobStore.error || 'Processing failed'}</span>
    {/if}
    {#if $jobStore.status === 'ready'}
      <span class="px-3 py-1 text-xs rounded-full bg-[var(--accent)] text-white font-bold">Ready</span>
    {/if}
  </div>

  <!-- Clips grid -->
  {#if $jobStore.clips.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each $jobStore.clips as clip (clip.id)}
        <ClipCard clip={clip} onExport={handleExport} />
      {/each}
    </div>
  {:else if $jobStore.status === 'ready'}
    <div class="border border-dashed border-[var(--border)] rounded-lg p-12 text-center">
      <p class="text-[var(--muted)] text-sm">No clips were generated from this video.</p>
    </div>
  {/if}
</div>
