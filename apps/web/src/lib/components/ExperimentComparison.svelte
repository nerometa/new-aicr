<script lang="ts">
  export let experiments: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    sourceVideoUrl: string;
    createdAt: string;
  }[] = [];
</script>

<div class="overflow-x-auto rounded-2xl border border-[var(--border)]">
  <table class="min-w-full divide-y divide-[var(--border)]">
    <thead class="bg-[var(--surface)]">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Experiment</th>
        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Created</th>
        <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Source Video</th>
      </tr>
    </thead>
    <tbody class="bg-[var(--surface-muted)] divide-y divide-[var(--border)]">
      {#each experiments as experiment}
        <tr class="hover:bg-[var(--surface)] transition-colors">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--fg)]">{experiment.name}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{new Date(experiment.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <a
              href={experiment.sourceVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[var(--accent)] hover:underline"
            >
              Watch
            </a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
