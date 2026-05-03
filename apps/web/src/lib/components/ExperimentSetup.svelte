<script lang="ts">
  import { API_BASE } from '$lib/api';
  import { toast } from '$lib/toast';

  let videoUrl = '';
  let name = '';
  let maxClips = 5;
  let duration = 60;
  let aspectRatio = '9:16';
  
  let loading = false;
  let error: string | null = null;

  async function handleSubmit() {
    loading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, name, maxClips, duration, aspectRatio }),
      });
      if (!res.ok) throw new Error('Failed to create experiment');
      
      toast.success('Experiment created successfully!');
      
      // Reset form
      videoUrl = '';
      name = '';
      maxClips = 5;
      duration = 60;
      aspectRatio = '9:16';
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
      toast.error(error);
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="p-6 bg-white rounded-lg shadow-md space-y-4">
  <h2 class="text-xl font-bold">Create New Experiment</h2>
  
  <div>
    <label class="block text-sm font-medium text-gray-700">Video URL</label>
    <input type="url" bind:value={videoUrl} required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700">Experiment Name</label>
    <input type="text" bind:value={name} required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Max Clips</label>
      <input type="number" bind:value={maxClips} min="1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Duration (sec)</label>
      <input type="number" bind:value={duration} min="10" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
    </div>
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700">Aspect Ratio</label>
    <select bind:value={aspectRatio} class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
      <option value="9:16">9:16 (Vertical)</option>
      <option value="16:9">16:9 (Horizontal)</option>
      <option value="1:1">1:1 (Square)</option>
    </select>
  </div>

  <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700" disabled={loading}>
    {loading ? 'Creating...' : 'Create Experiment'}
  </button>
</form>
