import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env before importing the module
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:3000',
  },
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getApiBase', () => {
    it('returns VITE_API_URL when set', async () => {
      const { getApiBase } = await import('./api');
      expect(getApiBase()).toBe('http://localhost:3000');
    });
  });

  describe('apiFetch', () => {
    it('makes GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '123' }),
      });

      const { getJob } = await import('./api');
      await getJob('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/jobs/123',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { getJob } = await import('./api');
      
      await expect(getJob('123')).rejects.toThrow('API Error: 500 Internal Server Error');
    });

    it('sends POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'job-123', status: 'pending' }),
      });

      const { createJob } = await import('./api');
      await createJob('https://youtube.com/watch?v=test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/jobs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ youtubeUrl: 'https://youtube.com/watch?v=test' }),
        })
      );
    });
  });
});
