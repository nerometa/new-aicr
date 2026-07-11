<script lang="ts">
  import type { PlanName } from '@aicr/shared';
  import { updateTier } from '$lib/stores/tier';
  import { toast } from '$lib/toast';

  let { plan, price, onclose } = $props<{ plan: PlanName; price: number; onclose: () => void }>();

  let cardNumber = $state('');
  let expiry = $state('');
  let cvc = $state('');
  let loading = $state(false);
  let cardError = $state('');
  let expiryError = $state('');
  let cvcError = $state('');

  function luhnCheck(num: string): boolean {
    const digits = num.replace(/\s/g, '');
    if (digits.length !== 16) return false;
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  function validateCard(): boolean {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length !== 16 || !/^\d+$/.test(digits)) {
      cardError = 'Card number must be 16 digits';
      return false;
    }
    if (!luhnCheck(digits)) {
      cardError = 'Invalid card number';
      return false;
    }
    cardError = '';
    return true;
  }

  function validateExpiry(): boolean {
    const match = expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/);
    if (!match) {
      expiryError = 'Use MM/YY format';
      return false;
    }
    expiryError = '';
    return true;
  }

  function validateCvc(): boolean {
    if (!/^\d{3}$/.test(cvc)) {
      cvcError = 'CVC must be 3 digits';
      return false;
    }
    cvcError = '';
    return true;
  }

  function validateAll(): boolean {
    const card = validateCard();
    const exp = validateExpiry();
    const cvcValid = validateCvc();
    return card && exp && cvcValid;
  }

  const isFormValid = $derived.by(() => {
    const digits = cardNumber.replace(/\s/g, '');
    return (
      digits.length === 16 &&
      /^\d+$/.test(digits) &&
      /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
      /^\d{3}$/.test(cvc)
    );
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!validateAll()) return;

    loading = true;
    try {
      await updateTier(plan);
      const label = plan.charAt(0).toUpperCase() + plan.slice(1);
      toast.success(`Upgraded to ${label}!`);
      onclose();
    } catch {
      toast.error('Upgrade failed. Please try again.');
    } finally {
      loading = false;
    }
  }

  const features: Record<string, string[]> = {
    pro: ['25 jobs/month', '฿25/job overage', '60-min videos'],
    business: ['120 jobs/month', '฿19/job overage', '120-min videos'],
  };

  const tierLabel = $derived(plan.charAt(0).toUpperCase() + plan.slice(1));
  const tierFeatures = $derived(features[plan] ?? []);
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={onclose}>
  <div class="bg-[var(--bg)] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-sm" onclick={(e) => e.stopPropagation()}>
    <h1 class="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-bold mb-1 text-center">
      Upgrade to {tierLabel}
    </h1>
    <p class="text-center text-[var(--muted)] text-sm mb-4 sm:mb-6">
      ฿{price}/month
    </p>

    {#if tierFeatures.length > 0}
      <ul class="space-y-1.5 mb-5 sm:mb-6">
        {#each tierFeatures as feature}
          <li class="flex items-center gap-2 text-sm text-[var(--fg)]">
            <span class="text-[var(--accent)]">✓</span>
            {feature}
          </li>
        {/each}
      </ul>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div>
          <input
            type="text"
            bind:value={cardNumber}
            onblur={validateCard}
            placeholder="4242 4242 4242 4242"
            maxlength={19}
            class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
          />
          {#if cardError}
            <p class="text-red-500 text-xs mt-1">{cardError}</p>
          {/if}
        </div>

        <div class="flex gap-3">
          <div class="flex-1">
            <input
              type="text"
              bind:value={expiry}
              onblur={validateExpiry}
              placeholder="MM/YY"
              maxlength={5}
              class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
            />
            {#if expiryError}
              <p class="text-red-500 text-xs mt-1">{expiryError}</p>
            {/if}
          </div>
          <div class="flex-1">
            <input
              type="text"
              bind:value={cvc}
              onblur={validateCvc}
              placeholder="CVC"
              maxlength={3}
              class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
            />
            {#if cvcError}
              <p class="text-red-500 text-xs mt-1">{cvcError}</p>
            {/if}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isFormValid}
        class="w-full bg-[var(--accent)] text-white py-2.5 sm:py-3 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Processing...' : `Pay ฿${price}/month`}
      </button>

      <button
        type="button"
        onclick={onclose}
        class="w-full text-[var(--muted)] text-sm font-medium py-2.5 sm:py-3 mt-2 hover:text-[var(--fg)] transition-colors"
      >
        Cancel
      </button>
    </form>
  </div>
</div>
