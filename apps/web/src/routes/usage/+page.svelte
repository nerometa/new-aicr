<script lang="ts">
  import { useSession } from '$lib/auth-client';
  import { usageStore, tierStore } from '$lib/stores/tier';
  import CheckoutModal from '$lib/components/CheckoutModal.svelte';
  import type { PlanName } from '@aicr/shared';

  const session = useSession();

  let showCheckout = $state(false);
  let checkoutPlan = $state<{ plan: PlanName; price: number } | null>(null);

  const isAuthenticated = $derived(!!$session.data?.user);
  const usage = $derived($usageStore);

  const planLabel = $derived(
    usage ? usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1) : '',
  );

  const usagePercent = $derived(
    usage && usage.tierLimit > 0
      ? Math.min((usage.jobsThisMonth / usage.tierLimit) * 100, 100)
      : 0,
  );

  const overageTotal = $derived(
    usage ? usage.overageCount * usage.overageRate : 0,
  );

  const formattedResetDate = $derived(
    usage
      ? new Date(usage.resetDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
  );

  const planBadgeClasses = $derived.by(() => {
    if (!usage) return '';
    switch (usage.plan) {
      case 'free':
        return 'bg-[var(--surface-muted)] text-[var(--muted)]';
      case 'pro':
        return 'bg-[var(--accent)]/15 text-[var(--accent)]';
      case 'business':
        return 'bg-emerald-500/15 text-emerald-500';
      default:
        return 'bg-[var(--surface-muted)] text-[var(--muted)]';
    }
  });

  function statusColor(status: string): string {
    switch (status) {
      case 'processing':
        return 'bg-amber-500/15 text-amber-600';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-600';
      case 'failed':
        return 'bg-red-500/15 text-red-600';
      default:
        return 'bg-[var(--surface-muted)] text-[var(--muted)]';
    }
  }

  function formatJobDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  function openUpgrade(plan: PlanName, price: number) {
    checkoutPlan = { plan, price };
    showCheckout = true;
  }

  function closeCheckout() {
    showCheckout = false;
    checkoutPlan = null;
  }
</script>

<svelte:head>
  <title>Usage — AICR</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
  {#if !isAuthenticated}
    <div class="text-center py-20">
      <h1 class="font-['Barlow_Condensed'] text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Usage
      </h1>
      <p class="text-[var(--muted)] mb-6">
        Please log in to view your usage.
      </p>
      <a
        href="/"
        class="inline-block px-6 py-2.5 text-sm font-semibold rounded-[var(--radius-button)] border border-[var(--border)] text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
      >
        Go Home
      </a>
    </div>
  {:else if !usage}
    <div class="text-center py-20">
      <div class="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-[var(--muted)] text-sm">Loading usage data...</p>
    </div>
  {:else}
    <div class="mb-8">
      <h1 class="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-black tracking-tight mb-4">
        Usage
      </h1>

      <span class="inline-block px-4 py-1.5 text-sm font-semibold tracking-wide rounded-full {planBadgeClasses}">
        {planLabel}
      </span>
    </div>

    <div class="bg-[var(--surface)] rounded-[var(--radius-container)] p-6 sm:p-8 mb-6">
      <h2 class="font-['Barlow_Condensed'] text-lg font-bold tracking-tight text-[var(--muted)] mb-4">
        Jobs this month
      </h2>

      <div class="mb-3">
        <div class="h-3 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
          <div
            class="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
            style="width: {usagePercent}%"
          ></div>
        </div>
      </div>
      <p class="text-sm text-[var(--muted)]">
        <span class="text-[var(--fg)] font-semibold">{usage.jobsThisMonth}</span>
        / {usage.tierLimit} jobs
      </p>

      {#if usage.overageCount > 0}
        <div class="mt-5 pt-5 border-t border-[var(--border)]">
          <p class="text-sm text-[var(--muted)]">
            {usage.overageCount} overage job{usage.overageCount !== 1 ? 's' : ''} × ฿{usage.overageRate}
            = <span class="text-[var(--fg)] font-semibold">฿{overageTotal}</span>
          </p>
        </div>
      {/if}
    </div>

    <div class="bg-[var(--surface)] rounded-[var(--radius-container)] p-6 sm:p-8 mb-6">
      <p class="text-sm text-[var(--muted)] mb-1">Estimated monthly total</p>
      <p class="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-black tracking-tight">
        ฿{usage.estimatedTotal}
      </p>
      <p class="text-sm text-[var(--muted)] mt-2">
        Resets on {formattedResetDate}
      </p>
    </div>

    {#if usage.plan !== 'business'}
      <div class="bg-[var(--surface)] rounded-[var(--radius-container)] p-6 sm:p-8 mb-6">
        <p class="text-sm text-[var(--muted)] mb-3">Need more jobs?</p>
        <div class="flex flex-wrap gap-3">
          {#if usage.plan === 'free'}
            <button
              onclick={() => openUpgrade('pro', 490)}
              class="px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-button)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro — ฿490/mo
            </button>
            <button
              onclick={() => openUpgrade('business', 1590)}
              class="px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-button)] border border-[var(--border)] text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
            >
              Upgrade to Business — ฿1,590/mo
            </button>
          {:else}
            <button
              onclick={() => openUpgrade('business', 1590)}
              class="px-5 py-2.5 text-sm font-semibold rounded-[var(--radius-button)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Upgrade to Business — ฿1,590/mo
            </button>
          {/if}
        </div>
      </div>
    {/if}

    {#if usage.recentJobs.length > 0}
      <div class="bg-[var(--surface)] rounded-[var(--radius-container)] p-6 sm:p-8">
        <h2 class="font-['Barlow_Condensed'] text-lg font-bold tracking-tight text-[var(--muted)] mb-4">
          Recent jobs
        </h2>
        <ul class="divide-y divide-[var(--border)]">
          {#each usage.recentJobs.slice(0, 5) as job (job.id)}
            <li class="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-[var(--fg)] truncate">
                  {job.provider}
                </p>
                <p class="text-xs text-[var(--muted)] mt-0.5">
                  {formatJobDate(job.createdAt)}
                </p>
              </div>
              <span class="ml-3 inline-block px-2.5 py-1 text-xs font-medium rounded-full {statusColor(job.status)}">
                {job.status}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</div>

{#if showCheckout && checkoutPlan}
  <CheckoutModal
    plan={checkoutPlan.plan}
    price={checkoutPlan.price}
    onclose={closeCheckout}
  />
{/if}

<style>
  :global(body) {
    background-color: var(--bg);
    color: var(--fg);
  }
</style>
