<script lang="ts">
  import { API_BASE } from '$lib/api';
  import { toast } from '$lib/toast';
  import { createEventDispatcher } from 'svelte';

  type ConfigForm = {
    maxDuration?: number;
    maxClipCount?: number;
    aspectRatio: string;
    captions: boolean;
    emojis: boolean;
    removeSilences: boolean;
  };

  const dispatch = createEventDispatcher<{ created: { experimentId: string } }>();

  const defaultConfig = (): ConfigForm => ({
    maxDuration: 60,
    maxClipCount: 3,
    aspectRatio: '9:16',
    captions: true,
    emojis: true,
    removeSilences: false,
  });

  let videoUrl = '';
  let name = '';
  let description = '';
  let configs: ConfigForm[] = [defaultConfig()];
  let loading = false;
  let error: string | null = null;

  const setConfigValue = (index: number, key: keyof ConfigForm, value: ConfigForm[keyof ConfigForm]) => {
    configs = configs.map((cfg, cfgIndex) =>
      cfgIndex === index ? { ...cfg, [key]: value } : cfg
    );
  };

  const addConfig = () => {
    configs = [...configs, defaultConfig()];
  };

  const removeConfig = (index: number) => {
    if (configs.length === 1) return;
    configs = configs.filter((_, cfgIndex) => cfgIndex !== index);
  };

  const formatConfigs = () => {
    return configs
      .map((cfg) => {
        const formatted: Record<string, unknown> = {};
        if (cfg.maxDuration && cfg.maxDuration > 0) {
          formatted.max_duration = cfg.maxDuration;
        }
        if (cfg.maxClipCount && cfg.maxClipCount > 0) {
          formatted.max_clip_count = cfg.maxClipCount;
        }

        const editingOptions: Record<string, boolean> = {};
        if (cfg.captions) editingOptions.captions = true;
        if (cfg.emojis) editingOptions.emojis = true;
        if (cfg.removeSilences) editingOptions.remove_silences = true;
        if (Object.keys(editingOptions).length > 0) {
          formatted.editing_options = editingOptions;
        }

        if (cfg.aspectRatio) {
          formatted.dimensions = { aspectRatio: cfg.aspectRatio };
        }

        return Object.keys(formatted).length > 0 ? formatted : null;
      })
      .filter((cfg) => cfg) as Array<Record<string, unknown>>;
  };

  async function handleSubmit() {
    if (!videoUrl.trim() || !name.trim()) {
      error = 'Video URL and experiment name are required.';
      return;
    }

    const validConfigs = formatConfigs();
    if (validConfigs.length === 0) {
      error = 'Each variant needs at least a duration or max clip count.';
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
          configurations: validConfigs,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error ?? payload.message ?? 'Failed to create experiment.');
      }

      toast.success('Experiment created successfully!');

      videoUrl = '';
      name = '';
      description = '';
      configs = [defaultConfig()];

      dispatch('created', { experimentId: payload.id });
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
      toast.error(error);
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
      <p class="text-xs text-[var(--muted)]">Share a source video, define variants, and let Klap do the rest.</p>
    </div>
    <span class="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
      Variants: {configs.length}
    </span>
  </header>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <label class="space-y-2">
      <span class="text-xs font-semibold text-[var(--fg)]">Video URL</span>
      <input
        type="url"
        value={videoUrl}
        on:input={(event) => (videoUrl = event.currentTarget.value)}
        required
        aria-describedby="video-url-hint"
        class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
      />
      <span id="video-url-hint" class="text-xs text-[var(--muted)]">Paste a YouTube link</span>
    </label>
    <label class="space-y-2">
      <span class="text-xs font-semibold text-[var(--fg)]">Experiment name</span>
      <input
        type="text"
        value={name}
        on:input={(event) => (name = event.currentTarget.value)}
        required
        aria-describedby="experiment-name-hint"
        class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
      />
      <span id="experiment-name-hint" class="text-xs text-[var(--muted)]">e.g. "Summer campaign test"</span>
    </label>
  </div>

  <label class="space-y-2">
    <span class="text-xs font-semibold text-[var(--fg)]">Description <span class="font-normal text-[var(--muted)]">(optional)</span></span>
    <textarea
      rows="2"
      value={description}
      on:input={(event) => (description = event.currentTarget.value)}
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
            <p class="text-xs text-[var(--muted)]">Customize duration, clips, and editing options.</p>
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

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="space-y-2 text-xs font-semibold text-[var(--fg)]">
            <span>Duration (sec)</span>
            <input
              type="number"
              min="10"
              max="180"
              class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              value={config.maxDuration ?? ''}
              on:input={(event) =>
                setConfigValue(index, 'maxDuration',
                  event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))
              }
            />
          </label>
          <label class="space-y-2 text-xs font-semibold text-[var(--fg)]">
            <span>Max clips</span>
            <input
              type="number"
              min="1"
              max="10"
              class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              value={config.maxClipCount ?? ''}
              on:input={(event) =>
                setConfigValue(index, 'maxClipCount',
                  event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))
              }
            />
          </label>
          <label class="space-y-2 text-xs font-semibold text-[var(--fg)]">
            <span>Aspect ratio</span>
            <select
              class="block w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] transition-colors duration-150 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              value={config.aspectRatio}
              on:change={(event) => setConfigValue(index, 'aspectRatio', event.currentTarget.value)}
            >
              <option value="9:16">9:16 (Vertical)</option>
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </label>
        </div>

        <fieldset class="grid gap-2 text-xs text-[var(--fg)] sm:grid-cols-3">
          <legend class="sr-only">Editing options for variant {index + 1}</legend>
          <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors duration-150 hover:border-[var(--accent)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.captions}
              on:change={(event) => setConfigValue(index, 'captions', event.currentTarget.checked)}
              class="h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <span class="text-sm">Captions</span>
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors duration-150 hover:border-[var(--accent)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.emojis}
              on:change={(event) => setConfigValue(index, 'emojis', event.currentTarget.checked)}
              class="h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <span class="text-sm">Emojis</span>
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors duration-150 hover:border-[var(--accent)]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.removeSilences}
              on:change={(event) => setConfigValue(index, 'removeSilences', event.currentTarget.checked)}
              class="h-4 w-4 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <span class="text-sm">Silences</span>
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
    <p class="text-xs text-[var(--muted)]">Variants power Klap multi-configuration jobs.</p>
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
