<script lang="ts">
  import { createJob, getProviders, ApiError } from '$lib/api';
  import { toast } from '$lib/toast';
  import { viewStore } from '$lib/stores/view';
  import { onMount } from 'svelte';

  let url = $state('');
  let provider = $state('reap');
  let loading = $state(false);
  let providers = $state<string[]>(['reap', 'reka']); // fallback defaults

  onMount(async () => {
    try {
      const res = await getProviders();
      if (res.providers?.length) {
        providers = res.providers;
        // Reset to first available if current not registered
        if (!providers.includes(provider)) {
          provider = providers[0]!;
        }
      }
    } catch {
      // Keep fallback defaults on network failure
    }
  });

  async function submit() {
    if (!url) return;
    loading = true;
    try {
      const job = await createJob(url, provider);
      viewStore.toJob(job.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        viewStore.openAuthModal();
      } else {
        const message = e instanceof Error ? e.message : 'Failed to start. Check your URL.';
        toast.error(message);
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col gap-2 max-w-2xl w-full">
  <div class="flex flex-col sm:flex-row gap-2 sm:gap-2 p-2 sm:p-2 bg-[var(--bg)] rounded-2xl border border-[var(--border)] shadow-sm">
    <input
      bind:value={url}
      type="url"
      placeholder="https://youtube.com/watch?v=..."
      class="flex-1 bg-transparent px-3 sm:px-4 py-2 sm:py-3 text-sm text-[var(--fg)] focus:outline-none transition-colors"
    />
    <button
      onclick={submit}
      disabled={loading || !url}
      class="bg-[var(--accent)] text-white px-4 sm:px-8 py-2 sm:py-3 font-semibold text-xs sm:text-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 rounded-xl w-full sm:w-auto"
    >
      {loading ? 'PROCESSING...' : 'GENERATE'}
    </button>
  </div>

  <div class="flex items-center gap-2 px-1">
    <span class="text-xs text-[var(--muted)] font-semibold uppercase tracking-[0.2em]">Provider</span>
    <div class="flex gap-1">
      {#each providers as p}
        <button
          type="button"
          onclick={() => (provider = p)}
          class="px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 {provider === p
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/40'
            : 'text-[var(--muted)] border border-[var(--border)] hover:border-[var(--accent)]/30'}"
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      {/each}
    </div>
  </div>
</div>
