import { writable } from 'svelte/store';
import type { PlanName, UsageResponse } from '@aicr/shared';
import { getUsage, updateTier as apiUpdateTier } from '../api';

export const tierStore = writable<PlanName>('free');
export const usageStore = writable<UsageResponse | null>(null);

export async function fetchUsage(): Promise<void> {
  try {
    const usage = await getUsage();
    tierStore.set(usage.plan);
    usageStore.set(usage);
  } catch {
    // Fail silently — user may not be authenticated yet
  }
}

export async function updateTier(plan: PlanName): Promise<void> {
  await apiUpdateTier(plan);
  tierStore.set(plan);
  await fetchUsage();
}
