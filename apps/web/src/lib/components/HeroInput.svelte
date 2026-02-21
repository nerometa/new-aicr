<script lang="ts">
  import { createJob } from '$lib/api';
  import { toast } from '$lib/toast';
  import { viewStore } from '$lib/stores/view';

  let url = $state('');
  let loading = $state(false);

  async function submit() {
    if (!url) return;
    loading = true;
    try {
      const job = await createJob(url);
      viewStore.toJob(job.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to start. Check your URL.';
      toast.error(message);
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col sm:flex-row gap-2 max-w-2xl w-full p-2 bg-[var(--bg)] rounded-2xl border border-[var(--border)] shadow-sm">
  <input
    bind:value={url}
    type="url"
    placeholder="https://youtube.com/watch?v=..."
    class="flex-1 bg-transparent px-4 py-3 text-sm text-[var(--fg)] focus:outline-none transition-colors"
  />
  <button
    onclick={submit}
    disabled={loading || !url}
    class="bg-[var(--accent)] text-white px-8 py-3 font-semibold text-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 rounded-xl"
  >
    {loading ? 'PROCESSING...' : 'GENERATE'}
  </button>
</div>
