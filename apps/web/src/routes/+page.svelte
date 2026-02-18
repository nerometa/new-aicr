<script lang="ts">
  import { goto } from '$app/navigation';
  import { createJob } from '$lib/api';
  
  let url = $state('');
  let loading = $state(false);
  let error = $state('');
  
  async function submit() {
    if (!url) return;
    loading = true;
    error = '';
    try {
      const job = await createJob(url);
      goto(`/app/job/${job.id}`);
    } catch (e) {
      error = 'Failed to start. Check your URL.';
    } finally {
      loading = false;
    }
  }
</script>

<section class="px-8 pt-24 pb-16 max-w-4xl">
  <p class="text-xs tracking-[0.3em] text-[#d4ff00] mb-4">AI CONTENT REPURPOSER</p>
  <h1 class="font-['Barlow_Condensed'] text-[clamp(4rem,12vw,8rem)] font-black leading-none mb-8 tracking-tight">
    LONG VIDEO<br/>→ VIRAL SHORTS
  </h1>
  <p class="text-[#888] mb-12 max-w-xl">
    Paste a YouTube URL. Our AI analyzes the video, extracts the best moments, and hands you ready-to-post clips.
  </p>
  
  <div class="flex gap-0 max-w-2xl">
    <input
      bind:value={url}
      type="url"
      placeholder="https://youtube.com/watch?v=..."
      class="flex-1 bg-transparent border border-[#2a2a2a] px-4 py-3 text-sm focus:outline-none focus:border-[#d4ff00] transition-colors"
    />
    <button
      onclick={submit}
      disabled={loading || !url}
      class="bg-[#d4ff00] text-black px-8 py-3 font-['Barlow_Condensed'] font-bold text-sm tracking-wider hover:bg-white transition-colors disabled:opacity-40"
    >
      {loading ? 'PROCESSING...' : 'GENERATE'}
    </button>
  </div>
  {#if error}<p class="text-red-400 text-xs mt-2">{error}</p>{/if}
</section>
