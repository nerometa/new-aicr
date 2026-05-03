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

<form on:submit|preventDefault={handleSubmit} class="p-6 bg-white rounded-lg shadow-md space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold">Create New Experiment</h2>
    <span class="text-sm text-gray-500">Variants: {configs.length}</span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Video URL</label>
      <input
        type="url"
        value={videoUrl}
        on:input={(event) => (videoUrl = event.currentTarget.value)}
        required
        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Experiment Name</label>
      <input
        type="text"
        value={name}
        on:input={(event) => (name = event.currentTarget.value)}
        required
        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
      />
    </div>
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700">Description (optional)</label>
    <textarea
      rows="2"
      value={description}
      on:input={(event) => (description = event.currentTarget.value)}
      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
      placeholder="What are you testing?"
    ></textarea>
  </div>

  <div class="space-y-4">
    {#each configs as config, index}
      <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-semibold">Variant {index + 1}</h3>
            <p class="text-xs text-gray-500">Adjust duration, clip count, and editing options.</p>
          </div>
          <button
            type="button"
            on:click={() => removeConfig(index)}
            class="text-xs text-red-600 hover:text-red-800"
            disabled={configs.length === 1}
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="block text-xs text-gray-700">
            Duration (sec)
            <input
              type="number"
              min="10"
              max="180"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={config.maxDuration ?? ''}
              on:input={(event) =>
                setConfigValue(index, 'maxDuration',
                  event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))
              }
            />
          </label>

          <label class="block text-xs text-gray-700">
            Max Clips
            <input
              type="number"
              min="1"
              max="10"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={config.maxClipCount ?? ''}
              on:input={(event) =>
                setConfigValue(index, 'maxClipCount',
                  event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))
              }
            />
          </label>

          <label class="block text-xs text-gray-700">
            Aspect Ratio
            <select
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={config.aspectRatio}
              on:change={(event) => setConfigValue(index, 'aspectRatio', event.currentTarget.value)}
            >
              <option value="9:16">9:16 (Vertical)</option>
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.captions}
              on:change={(event) => setConfigValue(index, 'captions', event.currentTarget.checked)}
            />
            Enable captions
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.emojis}
              on:change={(event) => setConfigValue(index, 'emojis', event.currentTarget.checked)}
            />
            Add emojis
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.removeSilences}
              on:change={(event) => setConfigValue(index, 'removeSilences', event.currentTarget.checked)}
            />
            Remove silences
          </label>
        </div>
      </div>
    {/each}
  </div>

  <div class="flex gap-3">
    <button
      type="button"
      class="px-4 py-2 border border-dashed border-gray-400 rounded-md text-sm text-gray-700 hover:bg-gray-100"
      on:click={addConfig}
    >
      + Add variant
    </button>
    <span class="text-xs text-gray-500">Variants power Klap A/B jobs.</span>
  </div>

  {#if error}
    <p class="text-xs text-red-600">{error}</p>
  {/if}

  <button
    type="submit"
    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
    disabled={loading}
  >
    {loading ? 'Creating...' : 'Create Experiment'}
  </button>
</form>
