<script lang="ts">
  import { API_BASE, getProviders } from '$lib/api';
  import { toast } from '$lib/toast';
  import { createEventDispatcher, onMount } from 'svelte';

  // emojis removed — Reap-only internal config, not in shared ClipConfig
  type ConfigForm = {
    clipDuration: 30 | 60 | 90;
    orientation: 'portrait' | 'landscape' | 'square';
    captions: boolean;
  };

  const dispatch = createEventDispatcher<{ created: { experimentId: string } }>();

  const defaultConfig = (): ConfigForm => ({
    clipDuration: 30,
    orientation: 'portrait',
    captions: true,
  });

  let videoUrl = '';
  let name = '';
  let description = '';
  const ALL_PROVIDERS = ['reap', 'reka', 'vizard', 'ssemble'] as const;
  let provider = 'reap';
  let providers: string[] = [...ALL_PROVIDERS];
  let configs: ConfigForm[] = [defaultConfig()];
  let loading = false;
  let error: string | null = null;

  const setConfigValue = <K extends keyof ConfigForm>(index: number, key: K, value: ConfigForm[K]) => {
    configs = configs.map((cfg, i) => i === index ? { ...cfg, [key]: value } : cfg);
  };

  const addConfig = () => { configs = [...configs, defaultConfig()]; };
  const removeConfig = (index: number) => {
    if (configs.length === 1) return;
    configs = configs.filter((_, i) => i !== index);
  };

  onMount(async () => {
    try {
      const res = await getProviders();
      if (res.providers?.length) {
        providers = [...new Set([...res.providers, ...ALL_PROVIDERS])];
        if (!providers.includes(provider)) {
          provider = providers[0]!;
        }
      }
    } catch {
      // keep all known providers on network failure
    }
  });

  async function handleSubmit() {
    if (!videoUrl.trim() || !name.trim()) {
      error = 'Video URL and experiment name are required.';
      return;
    }

    loading = true;
    error = null;

    try {
      const res = await fetch(`${API_BASE}/api/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceVideoUrl: videoUrl,
          name,
          description: description || undefined,
          provider,
          configurations: configs,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error ?? payload.message ?? 'Failed to create experiment.');
      }

      toast.success('Experiment created!');
      videoUrl = '';
      name = '';
      description = '';
      provider = 'reap';
      configs = [defaultConfig()];
      dispatch('created', { experimentId: payload.id });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      toast.error(error ?? 'Unknown error');
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
  <header class="flex items-center justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Experiment setup</p>
      <h2 class="text-2xl font-semibold text-[var(--fg)]">Create a new experiment</h2>
      <p class="text-xs text-[var(--muted)]">Share a source video, define variants, and let AI do the rest.</p>
    </div>
    <span class="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
      Variants: {configs.length}
    </span>
  </header>

  <!-- Provider selection — fixed for all variants in this experiment -->
  <div class="flex items-center gap-3">
    <span class="text-xs font-semibold text-[var(--fg)] uppercase tracking-[0.2em]">Provider</span>
    <div class="flex gap-1">
      {#each providers as p}
        <button
          type="button"
          on:click={() => (provider = p)}
          class="px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 {provider === p
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/40'
            : 'text-[var(--muted)] border border-[var(--border)] hover:border-[var(--accent)]/30'}"
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      {/each}
    </div>
    <span class="text-xs text-[var(--muted)]">All variants use the same provider</span>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <label class="space-y-2">
      <span class="text-xs font-semibold text-[var(--fg)]">Video URL</span>
      <input
        type="url"
        value={videoUrl}
        on:input={(e) => (videoUrl = e.currentTarget.value)}
        required
        placeholder="https://youtube.com/watch?v=..."
        class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
      />
    </label>
    <label class="space-y-2">
      <span class="text-xs font-semibold text-[var(--fg)]">Experiment name</span>
      <input
        type="text"
        value={name}
        on:input={(e) => (name = e.currentTarget.value)}
        required
        placeholder='e.g. "Portrait vs Square"'
        class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
      />
    </label>
  </div>

  <label class="space-y-2">
    <span class="text-xs font-semibold text-[var(--fg)]">Description <span class="font-normal text-[var(--muted)]">(optional)</span></span>
    <textarea
      rows="2"
      value={description}
      on:input={(e) => (description = e.currentTarget.value)}
      placeholder="What are you testing?"
      class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
    ></textarea>
  </label>

  <div class="space-y-4">
    {#each configs as config, index (index)}
      <article class="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 transition-colors duration-150">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-[var(--fg)]">Variant {index + 1}</p>
            <p class="text-xs text-[var(--muted)]">Clip duration, orientation, and caption options.</p>
          </div>
          <button
            type="button"
            on:click={() => removeConfig(index)}
            class="text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--accent)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            disabled={configs.length === 1}
            aria-label={`Remove variant ${index + 1}`}
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="space-y-2 text-xs font-semibold text-[var(--fg)]">
            <span>Clip duration</span>
            <select
              class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              value={config.clipDuration}
              on:change={(e) => setConfigValue(index, 'clipDuration', Number(e.currentTarget.value) as 30 | 60 | 90)}
            >
              <option value={30}>30s (short)</option>
              <option value={60}>60s (medium)</option>
              <option value={90}>90s (long)</option>
            </select>
          </label>
          <label class="space-y-2 text-xs font-semibold text-[var(--fg)]">
            <span>Orientation</span>
            <select
              class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              value={config.orientation}
              on:change={(e) => setConfigValue(index, 'orientation', e.currentTarget.value as 'portrait' | 'landscape' | 'square')}
            >
              <option value="portrait">Portrait 9:16</option>
              <option value="landscape">Landscape 16:9</option>
              <option value="square">Square 1:1</option>
            </select>
          </label>
        </div>

        <fieldset class="grid gap-2 text-xs text-[var(--fg)] sm:grid-cols-2">
          <legend class="sr-only">Editing options for variant {index + 1}</legend>
          <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors duration-150 hover:border-[var(--accent)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.captions}
              on:change={(e) => setConfigValue(index, 'captions', e.currentTarget.checked)}
              class="h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <span class="text-sm">Captions</span>
          </label>
        </fieldset>
      </article>
    {/each}
  </div>

  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--fg)] transition-colors duration-150 hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
      on:click={addConfig}
    >
      + Add variant
    </button>
    <p class="text-xs text-[var(--muted)]">Variants power multi-configuration clipping jobs.</p>
  </div>

  {#if error}
    <p role="alert" class="text-xs text-red-600">{error}</p>
  {/if}

  <button
    type="submit"
    class="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-3 text-sm font-semibold text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
    disabled={loading}
    aria-busy={loading}
  >
    {loading ? 'Creating…' : 'Create experiment'}
  </button>
</form>
