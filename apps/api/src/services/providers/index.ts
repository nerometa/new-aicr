// Provider registry — built at boot from available API keys.
// To add a provider: implement ClipProvider, import here, add to factory.
// Domain code uses getProvider(job.provider) — never the old singleton.

import type { ClipProvider } from './types';
import { reapProvider } from './reap';
import { rekaProvider } from './reka';

const PROVIDERS: Record<string, ClipProvider> = {
  reap: reapProvider,
  reka: rekaProvider,
};

export const PROVIDER_NAMES = Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>;

/**
 * Resolve a provider by name. Throws if name is not registered.
 * Call sites: poller, webhook handler, clips route, jobs route, experiments route.
 */
export function getProvider(name: string): ClipProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}

export type { ClipProvider, ClipConfig, ProviderClip } from './types';
