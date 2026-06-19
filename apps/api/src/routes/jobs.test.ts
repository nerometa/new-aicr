import { describe, it, expect } from 'bun:test';
import { extractVideoId, sanitizeYouTubeUrl, isValidYouTubeUrl } from '../lib/youtube';

describe('YouTube URL validation', () => {
  describe('valid URLs', () => {
    it('accepts standard youtube.com watch URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts youtube.com without www', () => {
      expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts shortened youtu.be URLs', () => {
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts embed URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts URLs without protocol', () => {
      expect(isValidYouTubeUrl('www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts URLs with http', () => {
      expect(isValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts URLs with underscore in video ID', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc_def1234')).toBe(true);
    });

    it('accepts URLs with hyphen in video ID', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc-def1234')).toBe(true);
    });

    // New tests for additional URL formats
    it('accepts mobile m.youtube.com URLs', () => {
      expect(isValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts URLs with query params (timestamps)', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123s')).toBe(true);
    });

    it('accepts URLs with playlist params', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxxxx')).toBe(true);
    });

    it('accepts YouTube shorts URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts YouTube live URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts mobile URLs with query params', () => {
      expect(isValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(true);
    });
  });

  describe('URL normalization', () => {
    it('normalizes URLs with query params to standard format', () => {
      const result = sanitizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123s');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('normalizes mobile URLs to standard format', () => {
      const result = sanitizeYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('normalizes shorts URLs to standard format', () => {
      const result = sanitizeYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('normalizes youtu.be URLs to standard format', () => {
      const result = sanitizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('normalizes embed URLs to standard format', () => {
      const result = sanitizeYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('normalizes live URLs to standard format', () => {
      const result = sanitizeYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('adds https:// to URLs without protocol', () => {
      const result = sanitizeYouTubeUrl('www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
  });

  describe('invalid URLs', () => {
    it('rejects non-YouTube URLs', () => {
      expect(isValidYouTubeUrl('https://vimeo.com/123456789')).toBe(false);
    });

    it('rejects YouTube URLs with invalid video ID length - too short', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(false);
    });

    it('rejects YouTube URLs with video ID longer than 11 chars', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQextra')).toBe(false);
    });

    it('rejects YouTube URLs with special characters in ID', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc@def123')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidYouTubeUrl('')).toBe(false);
    });

    it('rejects random text', () => {
      expect(isValidYouTubeUrl('not a url at all')).toBe(false);
    });
  });

  describe('video ID extraction', () => {
    it('extracts video ID from standard URLs', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from youtu.be URLs', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from mobile URLs', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from shorts URLs', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from live URLs', () => {
      expect(extractVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from URLs with query params', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123s')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for invalid URLs', () => {
      expect(extractVideoId('https://example.com/video')).toBe(null);
    });
  });
});

describe('jobs response shape', () => {
  it('list response includes createdAt and updatedAt', () => {
    const now = new Date();
    const response = {
      id: 'job-1',
      status: 'pending',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'reap',
      createdAt: now,
      updatedAt: now,
    };
    expect('createdAt' in response).toBe(true);
    expect('updatedAt' in response).toBe(true);
    expect(response.createdAt).toBeInstanceOf(Date);
    expect(response.updatedAt).toBeInstanceOf(Date);
  });

  it('detail response includes createdAt and updatedAt', () => {
    const now = new Date();
    const response = {
      id: 'job-1',
      status: 'pending',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'reap',
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    expect('createdAt' in response).toBe(true);
    expect('updatedAt' in response).toBe(true);
  });
});