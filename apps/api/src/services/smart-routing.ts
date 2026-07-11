import { getVideoDurationSeconds } from '../lib/youtube-duration';
import { PROVIDERS } from './providers/index';

export function routeProvider(durationSeconds: number | null): string {
  if (durationSeconds === null || durationSeconds <= 0) return 'reap';
  if (durationSeconds <= 1200) return 'reap'; // ≤20 min
  if (durationSeconds <= 3600) { // 20-60 min
    return 'vizard' in PROVIDERS ? 'vizard' : 'reka';
  }
  return 'reka'; // >60 min
}

export async function getProviderForVideo(videoId: string): Promise<string> {
  const duration = await getVideoDurationSeconds(videoId);
  return routeProvider(duration);
}
