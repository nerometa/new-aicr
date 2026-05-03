<script lang="ts">
  import type { Clip } from '@aicr/shared';
  import ClipCard from './ClipCard.svelte';

  let { clips, onExport, exportingClipId = null }: { clips: Clip[]; onExport: (clip: Clip) => void; exportingClipId?: string | null } = $props();
</script>

<div class="space-y-6">
  <h2 class="text-xl font-bold text-[var(--text)]">Experiment Results</h2>
  
  {#if clips.length === 0}
    <div class="text-center py-10 border border-dashed border-[var(--border)] rounded-xl">
      <p class="text-[var(--muted)]">No clips generated yet.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each clips as clip}
        <ClipCard {clip} {onExport} {exportingClipId} />
      {/each}
    </div>
  {/if}
</div>
