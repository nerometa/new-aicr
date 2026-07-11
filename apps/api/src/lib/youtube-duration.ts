import { env } from '../env';

export function parseISODuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function getVideoDurationSeconds(videoId: string): Promise<number | null> {
  if (!env.YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${env.YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { contentDetails: { duration: string } }[] };
    if (!data.items || data.items.length === 0) return null;
    return parseISODuration(data.items[0]?.contentDetails?.duration ?? 'PT0S');
  } catch {
    return null;
  }
}
