const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?!\w)/,
];

/**
 * Extract video ID from various YouTube URL formats.
 * Returns null if the URL doesn't match any known pattern.
 */
export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Sanitize YouTube URL — validate and normalize to standard watch format.
 * Returns null if the input is not a valid YouTube URL.
 */
export function sanitizeYouTubeUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Validate whether a string is a recognizable YouTube URL. */
export function isValidYouTubeUrl(url: string): boolean {
  return sanitizeYouTubeUrl(url) !== null;
}
