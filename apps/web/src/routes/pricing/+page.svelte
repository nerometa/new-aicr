<script lang="ts">
  import { tierStore } from '$lib/stores/tier';
  import { viewStore } from '$lib/stores/view';
  import { useSession } from '$lib/auth-client';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import type { PlanName } from '@aicr/shared';

  const session = useSession();

  let checkoutTier = $state<PlanName | null>(null);

  const tiers = [
    {
      id: 'free' as PlanName,
      name: 'Free',
      price: '฿0',
      period: 'forever',
      jobs: '3 jobs/mo',
      overage: null,
      maxVideo: '20 min',
      description: 'Try it out. No card required.',
      cta: 'Get Started',
      highlighted: false,
    },
    {
      id: 'pro' as PlanName,
      name: 'Pro',
      price: '฿490',
      period: '/mo',
      jobs: '25 jobs/mo',
      overage: '฿25/job after',
      maxVideo: '60 min',
      description: 'For creators who ship weekly.',
      cta: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      id: 'business' as PlanName,
      name: 'Business',
      price: '฿1,590',
      period: '/mo',
      jobs: '120 jobs/mo',
      overage: '฿19/job after',
      maxVideo: '120 min',
      description: 'Teams running multiple channels.',
      cta: 'Upgrade to Business',
      highlighted: false,
    },
  ];

  type FeatureValue = boolean | string;

  interface Feature {
    name: string;
    free: FeatureValue;
    pro: FeatureValue;
    business: FeatureValue;
  }

  const features: Feature[] = [
    { name: 'Virality score', free: true, pro: true, business: true },
    { name: 'Clip download', free: false, pro: true, business: true },
    { name: 'Clip duration', free: '30s only', pro: '30/60/90s', business: '30/60/90s' },
    { name: 'Orientation', free: 'Portrait only', pro: 'All', business: 'All' },
    { name: 'Captions', free: true, pro: true, business: true },
    { name: 'CSV export', free: false, pro: true, business: true },
    { name: 'Priority queue', free: false, pro: true, business: true },
  ];

  const currentPlan = $derived($tierStore);
  const isAuthenticated = $derived(!!$session.data?.user);

  function handleUpgrade(tierId: PlanName) {
    if (!isAuthenticated) {
      viewStore.openAuthModal();
      return;
    }
    if (tierId === currentPlan) return;
    checkoutTier = tierId;
  }

  function getButtonLabel(tierId: PlanName, cta: string): string {
    if (!isAuthenticated) return cta;
    if (tierId === currentPlan) return 'Current Plan';
    return cta;
  }

  function isButtonDisabled(tierId: PlanName): boolean {
    return isAuthenticated && tierId === currentPlan;
  }

  function renderFeatureValue(value: FeatureValue): string {
    if (value === true) return '✓';
    if (value === false) return '✗';
    return value;
  }

  function getFeatureClass(value: FeatureValue): string {
    if (value === true) return 'text-[var(--accent)]';
    if (value === false) return 'text-[var(--muted)]';
    return 'text-[var(--fg)]';
  }
</script>

<svelte:head>
  <title>Pricing — AICR</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
  <div class="mb-12 sm:mb-16 max-w-2xl">
    <h1 class="font-['Barlow_Condensed'] text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tight mb-4">
      Simple pricing,<br />no surprises.
    </h1>
    <p class="text-[var(--muted)] text-base sm:text-lg leading-relaxed">
      Start free. Upgrade when you need more jobs, longer videos, or team features. All plans include AI clipping and virality scoring.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-24">
    {#each tiers as tier (tier.id)}
      <div
        class="relative flex flex-col p-6 sm:p-8 rounded-[var(--radius-container)] border transition-colors
          {tier.highlighted
          ? 'border-[var(--accent)] bg-[var(--surface)]'
          : 'border-[var(--border)] bg-[var(--bg)]'}"
      >
        {#if tier.highlighted}
          <span class="absolute -top-3 left-6 px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-[var(--accent)] text-white rounded-full">
            Most Popular
          </span>
        {/if}

        <div class="mb-6">
          <h2 class="font-['Barlow_Condensed'] text-2xl font-bold tracking-tight mb-1">
            {tier.name}
          </h2>
          <p class="text-[var(--muted)] text-sm leading-snug">
            {tier.description}
          </p>
        </div>

        <div class="mb-6">
          <div class="flex items-baseline gap-1">
            <span class="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-black tracking-tight">
              {tier.price}
            </span>
            <span class="text-[var(--muted)] text-sm">{tier.period}</span>
          </div>
          <p class="text-[var(--muted)] text-xs mt-1">{tier.jobs}</p>
          {#if tier.overage}
            <p class="text-[var(--muted)] text-xs">{tier.overage}</p>
          {/if}
        </div>

        <ul class="space-y-2.5 mb-8 flex-1">
          <li class="flex items-start gap-2 text-sm">
            <span class="text-[var(--accent)] mt-px">✓</span>
            <span>Up to {tier.maxVideo} videos</span>
          </li>
          <li class="flex items-start gap-2 text-sm">
            <span class="text-[var(--accent)] mt-px">✓</span>
            <span>AI clipping + captions</span>
          </li>
          <li class="flex items-start gap-2 text-sm">
            <span class="text-[var(--accent)] mt-px">✓</span>
            <span>Virality scoring</span>
          </li>
          {#if tier.id !== 'free'}
            <li class="flex items-start gap-2 text-sm">
              <span class="text-[var(--accent)] mt-px">✓</span>
              <span>Clip downloads</span>
            </li>
          {/if}
          {#if tier.id === 'business'}
            <li class="flex items-start gap-2 text-sm">
              <span class="text-[var(--accent)] mt-px">✓</span>
              <span>Priority queue</span>
            </li>
          {/if}
        </ul>

        <button
          onclick={() => handleUpgrade(tier.id)}
          disabled={isButtonDisabled(tier.id)}
          class="w-full py-3 px-4 text-sm font-semibold rounded-[var(--radius-button)] transition-all
            {tier.highlighted
            ? 'bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
            : 'border border-[var(--border)] text-[var(--fg)] hover:border-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed'}"
        >
          {getButtonLabel(tier.id, tier.cta)}
        </button>
      </div>
    {/each}
  </div>

  <!-- Feature matrix -->
  <div>
    <h2 class="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-bold tracking-tight mb-6">
      Compare features
    </h2>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--border)]">
            <th class="text-left py-3 pr-4 font-medium text-[var(--muted)] w-[40%]">Feature</th>
            <th class="text-center px-4 py-3 font-['Barlow_Condensed'] text-lg font-bold w-[20%]">Free</th>
            <th class="text-center px-4 py-3 font-['Barlow_Condensed'] text-lg font-bold w-[20%] text-[var(--accent)]">Pro</th>
            <th class="text-center px-4 py-3 font-['Barlow_Condensed'] text-lg font-bold w-[20%]">Business</th>
          </tr>
        </thead>
        <tbody>
          {#each features as feature, i (feature.name)}
            <tr class="border-b border-[var(--border)]/50 {i % 2 === 0 ? 'bg-[var(--surface-muted)]' : ''}">
              <td class="py-3 pr-4 text-[var(--fg)]">{feature.name}</td>
              <td class="py-3 px-4 text-center {getFeatureClass(feature.free)}">
                {renderFeatureValue(feature.free)}
              </td>
              <td class="py-3 px-4 text-center {getFeatureClass(feature.pro)}">
                {renderFeatureValue(feature.pro)}
              </td>
              <td class="py-3 px-4 text-center {getFeatureClass(feature.business)}">
                {renderFeatureValue(feature.business)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

{#if $viewStore.showAuthModal}
  <AuthModal />
{/if}

{#if checkoutTier}
  <!-- CheckoutModal is being created in parallel — will exist by runtime -->
  {#if typeof window !== 'undefined'}
    {@const CheckoutModal = null}
    <!-- 
      Integration point: when CheckoutModal.svelte is available,
      import it at the top and render here:
      <CheckoutModal tier={checkoutTier} onClose={() => checkoutTier = null} />
    -->
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={() => checkoutTier = null}>
      <div class="bg-[var(--bg)] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-sm" onclick={(e) => e.stopPropagation()}>
        <h2 class="font-['Barlow_Condensed'] text-2xl font-bold mb-2">
          Upgrade to {checkoutTier === 'pro' ? 'Pro' : 'Business'}
        </h2>
        <p class="text-[var(--muted)] text-sm mb-6">
          Checkout is being set up. You'll be redirected to complete your subscription.
        </p>
        <button
          onclick={() => checkoutTier = null}
          class="w-full py-3 px-4 text-sm font-semibold rounded-[var(--radius-button)] border border-[var(--border)] text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  {/if}
{/if}

<style>
  :global(body) {
    background-color: var(--bg);
    color: var(--fg);
  }
</style>
