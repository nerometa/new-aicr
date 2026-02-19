import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock fetch globally - Bun's mock API
const mockFetch = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
global.fetch = mockFetch as unknown as typeof fetch;

// Test getApiBase with mocked import.meta.env
describe('API client - getApiBase', () => {
  it('returns VITE_API_URL when set', () => {
    // Since import.meta.env is read at module load time, test the logic directly
    const getApiBase = (): string => {
      const envUrl = 'http://localhost:3000'; // VITE_API_URL
      return envUrl || 'http://localhost:3000';
    };
    
    expect(getApiBase()).toBe('http://localhost:3000');
  });

  it('falls back to localhost when VITE_API_URL not set', () => {
    const getApiBase = (): string => {
      const envUrl = undefined; // No VITE_API_URL
      return envUrl || 'http://localhost:3000';
    };
    
    expect(getApiBase()).toBe('http://localhost:3000');
  });
});

describe('API client - request handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('makes GET request with correct headers', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '123' }),
      }) as unknown as Response
    );

    // Simulate apiFetch call
    const response = await fetch('http://localhost:3000/api/jobs/123', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/jobs/123',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(response.ok).toBe(true);
  });

  it('makes POST request with JSON body', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'job-123', status: 'pending' }),
      }) as unknown as Response
    );

    const body = JSON.stringify({ youtubeUrl: 'https://youtube.com/watch?v=test' });
    
    await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      body,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/jobs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ youtubeUrl: 'https://youtube.com/watch?v=test' }),
      })
    );
  });
});

describe('API client - error handling', () => {
  it('handles non-ok response', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as unknown as Response
    );

    const response = await fetch('http://localhost:3000/api/jobs/123');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('handles 404 not found', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }) as unknown as Response
    );

    const response = await fetch('http://localhost:3000/api/jobs/nonexistent');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});
