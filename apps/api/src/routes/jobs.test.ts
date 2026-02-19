import { describe, it, expect } from 'bun:test';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}$/;

const isValidYouTubeUrl = (url: string): boolean => YOUTUBE_URL_REGEX.test(url);

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

    it('rejects URLs with query params after video ID', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123s')).toBe(false);
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

    it('rejects YouTube shorts URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(false);
    });

    it('rejects YouTube live URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(false);
    });
  });
});
