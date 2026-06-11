// Provider registry — built at boot from available API keys.
// To add a provider: implement ClipProvider, import here, add to factory.
// Domain code uses getProvider(job.provider) — never the old singleton.

import type { ClipProvider } from './types';
import { env } from '../../env';
import { reapProvider } from './reap';
import { rekaProvider } from './reka';

const PROVIDERS: Record<string, ClipProvider> = {
  reap: reapProvider,
  reka: rekaProvider,
};

// Optional providers — only registered when their API key is present at boot.
if (env.VIZARD_API_KEY) {
  const { vizardProvider } = await import('./vizard');
  PROVIDERS['vizard'] = vizardProvider;
}
if (env.SSEMBLE_API_KEY) {
  const { ssembleProvider } = await import('./ssemble');
  PROVIDERS['ssemble'] = ssembleProvider;
}

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
