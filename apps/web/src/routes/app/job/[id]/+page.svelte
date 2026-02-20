<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { getJob, getClips, createExport, getExport, API_BASE } from '$lib/api';
  import type { Job, Clip } from '@aicr/shared';
  
  let job = $state<Job | null>(null);
  let clips = $state<Clip[]>([]);
  let status = $state('pending');
  let eventSource: EventSource | null = null;
  
  const jobId = $derived($page.params.id as string);
  
  onMount(async () => {
    if (!jobId) return;
    await loadJob();
    subscribeToSSE();
  });
  
  onDestroy(() => eventSource?.close());
  
  async function loadJob() {
    if (!jobId) return;
    try {
      job = await getJob(jobId);
      status = job?.status || 'pending';
      // Klap uses "ready" not "done"
      if (status === 'ready') await loadClips();
    } catch (e) {
      console.error('Failed to load job', e);
    }
  }
  
  async function loadClips() {
    if (!jobId) return;
    try {
      clips = await getClips(jobId);
      clips.sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0));
    } catch (e) {
      console.error('Failed to load clips', e);
    }
  }
  
  function subscribeToSSE() {
    eventSource = new EventSource(`${API_BASE}/api/jobs/sse/${jobId}`);
    eventSource.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      status = data.status;
      // Klap uses "ready" not "done"
      if (status === 'ready' || status === 'error') {
        eventSource?.close();
        if (status === 'ready') await loadClips();
      }
    };
    eventSource.onerror = () => eventSource?.close();
  }
  
  async function exportClip(clip: Clip) {
    clip.exportStatus = 'processing';
    clips = [...clips];
    
    try {
      const { exportId } = await createExport(clip.id);
      
      const poll = setInterval(async () => {
        try {
          const result = await getExport(clip.id, exportId);
          // Export status: "ready" not "done"
          if (result.status === 'ready' && result.exportUrl) {
            clip.exportUrl = result.exportUrl;
            clip.exportStatus = 'ready';
            clips = [...clips];
            clearInterval(poll);
          } else if (result.status === 'error') {
            clip.exportStatus = 'error';
            clips = [...clips];
            clearInterval(poll);
          }
        } catch (e) {
          clearInterval(poll);
        }
      }, 10000);
    } catch (e) {
      clip.exportStatus = 'error';
      clips = [...clips];
    }
  }
</script>

<div class="p-8">
  <!-- Status bar -->
  <div class="border border-[#2a2a2a] p-4 mb-8 flex items-center gap-4">
    <span class="text-xs tracking-widest text-[#888]">STATUS</span>
    <span class="text-[#d4ff00] font-bold uppercase text-sm">{status}</span>
    {#if status === 'processing'}
      <span class="text-xs text-[#555] animate-pulse">Klap is analyzing your video... this takes a few minutes.</span>
    {/if}
    {#if status === 'error'}
      <span class="text-xs text-[#f87171]">{job?.errorMessage || 'Processing failed'}</span>
    {/if}
  </div>
  
  <!-- Clips grid -->
  {#if clips.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {#each clips as clip, i}
        <div 
          class="border border-[#2a2a2a] flex flex-col" 
          style="animation: fadeUp 0.4s ease {i * 0.08}s both"
        >
          <!-- Klap player iframe -->
          <iframe
            src={clip.previewUrl}
            class="w-full aspect-[9/16]"
            frameborder="0"
            allow="autoplay; fullscreen"
            title={clip.name || 'Clip'}
          ></iframe>
          <div class="p-4 border-t border-[#2a2a2a]">
            <p class="text-xs text-[#888] mb-1">{clip.name || 'Untitled Clip'}</p>
            <p class="text-[#d4ff00] text-xs mb-4">
              VIRALITY: {Math.round((clip.viralityScore || 0) * 100)}%
            </p>
            {#if clip.exportUrl}
              <a 
                href={clip.exportUrl} 
                download 
                class="block text-center text-xs bg-[#d4ff00] text-black py-2 font-bold tracking-wider hover:bg-white transition-colors"
              >
                DOWNLOAD MP4
              </a>
            {:else if clip.exportStatus === 'processing'}
              <p class="text-xs text-center text-[#555] animate-pulse py-2">Exporting...</p>
            {:else if clip.exportStatus === 'error'}
              <p class="text-xs text-center text-[#f87171] py-2">Export failed</p>
            {:else}
              <button
                onclick={() => exportClip(clip)}
                class="w-full text-xs border border-[#d4ff00] text-[#d4ff00] py-2 hover:bg-[#d4ff00] hover:text-black transition-colors"
              >
                EXPORT CLIP
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if status === 'ready'}
    <div class="border border-dashed border-[#2a2a2a] p-8 text-center">
      <p class="text-[#888] text-sm">No clips were generated</p>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>