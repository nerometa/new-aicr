// Provider factory — resolved once at boot.
// To add a new provider: implement ClipProvider, import here, add to the map.

import type { ClipProvider } from './types';
import { reapProvider } from './reap';

const PROVIDERS: Record<string, ClipProvider> = {
  reap: reapProvider,
};

const ACTIVE_PROVIDER = 'reap';

export const provider: ClipProvider = PROVIDERS[ACTIVE_PROVIDER]!;

export type { ClipProvider, ClipConfig, ProviderClip } from './types';
