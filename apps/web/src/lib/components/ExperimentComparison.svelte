<script lang="ts">
  export let experiments: {
    id: string;
    name: string;
    views: number;
    engagement: number;
    quality: number;
  }[] = [];
</script>

<div class="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Experiment</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Views</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Engagement</th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quality</th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each experiments as experiment}
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{experiment.name}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{experiment.views.toLocaleString()}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{experiment.engagement.toFixed(1)}%</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            <div class="flex items-center">
              <span class="font-medium text-gray-900">{experiment.quality.toFixed(1)}</span>
              <span class="ml-1 text-gray-400">/ 10</span>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
