<script lang="ts">
  import type { Clip, ClipResponse } from '@aicr/shared';
  import { API_BASE } from '$lib/api';
  import { tierStore } from '../stores/tier';

  type ClipLike = (Clip & { clipUrl?: never }) | ClipResponse;
  let { clip, onExport, exportingClipId = null }: { clip: ClipLike; onExport: (clip: ClipLike) => void; exportingClipId?: string | null } = $props();

  const streamUrl = $derived(`${API_BASE}/api/clips/${clip.jobId}/stream/${clip.id}`);

  function downloadFile(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
</script>

<div class="border border-[var(--border)] rounded-xl shadow-sm flex flex-col overflow-hidden">
  <a
    href={streamUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="block bg-gray-100 aspect-[9/16] flex flex-col items-center justify-center hover:bg-gray-200 transition-colors"
  >
    <svg class="w-12 h-12 text-[var(--accent)] mb-2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
    <span class="text-xs text-[var(--muted)]">Preview Clip</span>
  </a>
  <div class="p-4 border-t border-[var(--border)] bg-[var(--bg)]">
    <p class="text-xs text-[var(--muted)] mb-1 truncate">{clip.title || 'Untitled Clip'}</p>
    <p class="text-[var(--accent)] text-sm font-bold mb-2">
      VIRALITY: {clip.viralityScore != null ? (clip.viralityScore / 10).toFixed(1) : '—'}/10
    </p>
    {#if clip.viralityScoreExplanation}
      <p class="text-xs text-gray-500 mb-4 line-clamp-2">{clip.viralityScoreExplanation}</p>
    {/if}

    {#if clip.clipUrl}
      {#if $tierStore === 'free'}
        <a
          href="/pricing"
          class="block w-full text-center text-xs bg-[var(--accent)] text-white py-2 font-bold tracking-wider rounded-md hover:bg-opacity-90 transition-colors"
        >
          UPGRADE TO DOWNLOAD
        </a>
      {:else}
        <a
          href={streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="block w-full text-center text-xs bg-[var(--accent)] text-white py-2 font-bold tracking-wider rounded-md hover:bg-opacity-90 transition-colors"
          download
        >
          DOWNLOAD
        </a>
      {/if}
    {:else if exportingClipId === clip.id}
      <p class="text-xs text-center text-[var(--muted)] animate-pulse py-2">Loading...</p>
    {:else}
      <p class="text-xs text-center text-[var(--muted)] py-2">URL unavailable</p>
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
