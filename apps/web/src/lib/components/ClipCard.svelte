<script lang="ts">
  import type { Clip } from '@aicr/shared';

  let { clip, onExport, exportingClipId = null }: { clip: Clip; onExport: (clip: Clip) => void; exportingClipId?: string | null } = $props();

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
    href={clip.embedUrl ?? clip.previewUrl}
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
    <p class="text-xs text-[var(--muted)] mb-1 truncate">{clip.name || 'Untitled Clip'}</p>
    <p class="text-[var(--accent)] text-sm font-bold mb-2">
      VIRALITY: {clip.viralityScore}/100
    </p>
    {#if clip.viralityScoreExplanation}
      <p class="text-xs text-gray-500 mb-4 line-clamp-2">{clip.viralityScoreExplanation}</p>
    {/if}

    {#if clip.exportUrl}
      <button
        onclick={() => clip.exportUrl && downloadFile(clip.exportUrl, `${clip.name || 'clip'}.mp4`)}
        class="w-full text-xs bg-[var(--accent)] text-white py-2 font-bold tracking-wider rounded-md hover:bg-opacity-90 transition-colors"
      >
        DOWNLOAD
      </button>
    {:else if clip.exportStatus === 'processing' || (exportingClipId === clip.id)}
      <p class="text-xs text-center text-[var(--muted)] animate-pulse py-2">Exporting...</p>
    {:else if clip.exportStatus === 'error'}
      <p class="text-xs text-center text-red-500 py-2">Export failed</p>
    {:else}
      <button
        onclick={() => onExport(clip)}
        class="w-full text-xs border border-[var(--accent)] text-[var(--accent)] py-2 rounded-md hover:bg-[var(--accent)] hover:text-white transition-colors"
      >
        EXPORT
      </button>
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
