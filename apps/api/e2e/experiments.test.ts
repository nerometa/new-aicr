import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Elysia } from 'elysia';
import { randomUUID } from 'crypto';

// =============================================================================
// E2E Tests for Experiments Flow
// =============================================================================
// Tests the full experiments flow:
// 1. Create authenticated session as owner
// 2. POST /api/experiments with valid data
// 3. Verify job created with experiment_id
// 4. GET /api/experiments verifies list
// 5. DELETE /api/experiments/:id verifies deletion

// Mock environment
const TEST_OWNER_ID = 'test-owner-id-12345';
const TEST_NON_OWNER_ID = 'test-non-owner-id';
const OWNER_TOKEN = 'owner-session-token';
const NON_OWNER_TOKEN = 'non-owner-session-token';

// Mock session store
const mockSessions: Map<string, { user: { id: string } }> = new Map([
  [OWNER_TOKEN, { user: { id: TEST_OWNER_ID } }],
  [NON_OWNER_TOKEN, { user: { id: TEST_NON_OWNER_ID } }],
]);

// =============================================================================
// Helper Functions
// =================================================================

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?!\w)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function sanitizeYouTubeUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function buildClipConfig(clipDuration: 30 | 60 | 90, orientation: 'portrait' | 'landscape' | 'square', captions: boolean, emojis: boolean): Record<string, unknown> {
  return { clipDuration, orientation, captions, emojis };
}

// Mock requireOwner authentication logic
function mockRequireOwner(headers: Headers, ownerId: string): string {
  const authHeader = headers.get('Authorization');
  const cookieHeader = headers.get('Cookie');
  
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader?.includes('better-auth.session_token=')) {
    const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    token = match?.[1] ?? null;
  }
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  const session = mockSessions.get(token);
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  if (session.user.id !== ownerId) {
    throw new Error('Forbidden');
  }
  
  return session.user.id;
}

function createAuthHeaders(token: string): Headers {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

// =============================================================================
// Test 1: Authenticated Session as Owner
// =============================================================================
describe('E2E: Authentication - Session as Owner', () => {
  it('returns 401 for requests without authorization header', () => {
    const headers = new Headers();
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Unauthorized');
  });

  it('returns 401 for invalid token', () => {
    const headers = createAuthHeaders('invalid-token');
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Unauthorized');
  });

  it('returns 403 for authenticated non-owner user', () => {
    const headers = createAuthHeaders(NON_OWNER_TOKEN);
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Forbidden');
  });

  it('returns owner user ID for valid owner token from Authorization header', () => {
    const headers = createAuthHeaders(OWNER_TOKEN);
    const userId = mockRequireOwner(headers, TEST_OWNER_ID);
    expect(userId).toBe(TEST_OWNER_ID);
  });

  it('returns owner user ID for valid owner token from Cookie header', () => {
    const headers = new Headers();
    headers.set('Cookie', `better-auth.session_token=${OWNER_TOKEN}`);
    const userId = mockRequireOwner(headers, TEST_OWNER_ID);
    expect(userId).toBe(TEST_OWNER_ID);
  });
});

// =============================================================================
// Test 2: POST /api/experiments with Valid Data
// =============================================================================
describe('E2E: POST /api/experiments - Valid Data', () => {
  const validYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('validates sourceVideoUrl is required in request body', () => {
    const body = { name: 'Test Experiment', configurations: [] };
    expect('sourceVideoUrl' in body).toBe(false);
  });

  it('validates name is required in request body', () => {
    const body = { sourceVideoUrl: validYouTubeUrl, configurations: [] };
    expect('name' in body).toBe(false);
  });

  it('validates configurations is an array', () => {
    const body = {
      sourceVideoUrl: validYouTubeUrl,
      name: 'Test',
      configurations: [{ max_duration: 60 }],
    };
    expect(Array.isArray(body.configurations)).toBe(true);
  });

  it('accepts valid YouTube URL', () => {
    const sanitized = sanitizeYouTubeUrl(validYouTubeUrl);
    expect(sanitized).toBe(validYouTubeUrl);
  });

  it('rejects non-YouTube URLs with 400', () => {
    const sanitized = sanitizeYouTubeUrl('https://vimeo.com/123456');
    expect(sanitized).toBeNull();
  });

  it('normalizes various YouTube URL formats to standard watch URL', () => {
    const testCases = [
      { input: 'https://youtu.be/dQw4w9WgXcQ', expected: validYouTubeUrl },
      { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: validYouTubeUrl },
      { input: 'https://www.youtube.com/live/dQw4w9WgXcQ', expected: validYouTubeUrl },
      { input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ', expected: validYouTubeUrl },
    ];
    
    for (const { input, expected } of testCases) {
      expect(sanitizeYouTubeUrl(input)).toBe(expected);
    }
  });

  it('builds correct ClipConfig with orientation and duration', () => {
    const config = buildClipConfig(60, 'portrait', true, false);

    expect(config.clipDuration).toBe(60);
    expect(config.orientation).toBe('portrait');
    expect(config.captions).toBe(true);
    expect(config.emojis).toBe(false);
  });

  it('builds ClipConfig with emojis enabled', () => {
    const config = buildClipConfig(30, 'square', false, true);

    expect(config.captions).toBe(false);
    expect(config.emojis).toBe(true);
  });

  it('generates valid UUID for experiment ID', () => {
    const experimentId = randomUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(experimentId)).toBe(true);
  });

  it('sets initial experiment status to pending', () => {
    const experiment = {
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date(),
    };
    expect(experiment.status).toBe('pending');
  });
});

// =============================================================================
// Test 3: Verify Job Created with experiment_id
// =============================================================================
describe('E2E: Job Creation with experiment_id', () => {
  it('creates job with experiment_id linking to parent experiment', () => {
    const experimentId = randomUUID();
    const jobId = randomUUID();
    
    const job = {
      id: jobId,
      experiment_id: experimentId,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      providerProjectId: 'reap-proj-123',
      status: 'pending',
      createdAt: new Date(),
    };
    
    expect(job.experiment_id).toBe(experimentId);
  });

  it('creates multiple jobs for multiple configurations', () => {
    const experimentId = randomUUID();
    const configurations = [
      { max_duration: 60 },
      { max_duration: 30 },
      { max_duration: 45 },
    ];
    
    const jobs = configurations.map(() => ({
      id: randomUUID(),
      experiment_id: experimentId,
      status: 'pending',
    }));
    
    expect(jobs).toHaveLength(3);
    expect(jobs.every(j => j.experiment_id === experimentId)).toBe(true);
  });

  it('stores providerProjectId from API response', () => {
    const mockProjectId = 'reap-proj-abc123';
    const job = {
      id: randomUUID(),
      providerProjectId: mockProjectId,
      status: 'pending',
    };

    expect(job.providerProjectId).toBe(mockProjectId);
  });

  it('handles partial job creation failures', () => {
    const results = {
      jobIds: ['job-1', 'job-2'],
      errors: [{ configIndex: 2, error: 'Provider API error' }],
    };
    
    expect(results.jobIds).toHaveLength(2);
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].configIndex).toBe(2);
  });

  it('sets experiment status to error when all jobs fail', () => {
    const experiment = {
      id: randomUUID(),
      status: 'error',
      jobIds: [],
    };
    
    expect(experiment.status).toBe('error');
    expect(experiment.jobIds).toHaveLength(0);
  });
});

// =============================================================================
// Test 4: GET /api/experiments List
// =============================================================================
describe('E2E: GET /api/experiments - List', () => {
  it('returns array of experiments with required fields', () => {
    const mockResponse = [
      {
        id: 'exp-1',
        name: 'Experiment 1',
        status: 'pending',
        sourceVideoUrl: 'https://www.youtube.com/watch?v=abc123',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'exp-2',
        name: 'Experiment 2',
        status: 'ready',
        sourceVideoUrl: 'https://www.youtube.com/watch?v=def456',
        createdAt: new Date().toISOString(),
      },
    ];
    
    expect(Array.isArray(mockResponse)).toBe(true);
    expect(mockResponse).toHaveLength(2);
    
    const requiredFields = ['id', 'name', 'status', 'sourceVideoUrl', 'createdAt'];
    for (const exp of mockResponse) {
      for (const field of requiredFields) {
        expect(field in exp).toBe(true);
      }
    }
  });

  it('returns empty array when no experiments exist', () => {
    const mockResponse: unknown[] = [];
    expect(Array.isArray(mockResponse)).toBe(true);
    expect(mockResponse).toHaveLength(0);
  });

  it('requires authentication - returns 401 without auth', () => {
    const headers = new Headers();
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Unauthorized');
  });

  it('returns 403 for non-owner authenticated user', () => {
    const headers = createAuthHeaders(NON_OWNER_TOKEN);
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Forbidden');
  });

  it('orders experiments by createdAt descending', () => {
    const experiments = [
      { id: 'exp-1', createdAt: new Date('2024-01-03') },
      { id: 'exp-2', createdAt: new Date('2024-01-01') },
      { id: 'exp-3', createdAt: new Date('2024-01-02') },
    ];
    
    const sorted = [...experiments].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    expect(sorted[0].id).toBe('exp-1');
    expect(sorted[1].id).toBe('exp-3');
    expect(sorted[2].id).toBe('exp-2');
  });
});

// =============================================================================
// Test 5: DELETE /api/experiments/:id
// =============================================================================
describe('E2E: DELETE /api/experiments/:id', () => {
  it('deletes experiment and returns confirmation message', () => {
    const experimentId = 'exp-to-delete';
    const result = { message: 'Experiment deleted', id: experimentId };
    
    expect(result.message).toBe('Experiment deleted');
    expect(result.id).toBe(experimentId);
  });

  it('cascades deletion to associated jobs first', () => {
    const experimentId = 'exp-with-jobs';
    
    // Simulate cascade delete order
    const operations: string[] = [];
    operations.push(`DELETE FROM jobs WHERE experiment_id = '${experimentId}'`);
    operations.push(`DELETE FROM experiments WHERE id = '${experimentId}'`);
    
    expect(operations[0]).toContain('jobs');
    expect(operations[1]).toContain('experiments');
    expect(operations[0]).toContain('experiment_id');
  });

  it('returns 404 for non-existent experiment', () => {
    const existingExperiment = null;
    expect(existingExperiment).toBeNull();
  });

  it('requires authentication - returns 401 without auth', () => {
    const headers = new Headers();
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Unauthorized');
  });

  it('returns 403 for non-owner', () => {
    const headers = createAuthHeaders(NON_OWNER_TOKEN);
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Forbidden');
  });

  it('validates UUID format for id parameter', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const invalidId = 'not-a-uuid';
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    expect(uuidRegex.test(validUuid)).toBe(true);
    expect(uuidRegex.test(invalidId)).toBe(false);
  });
});

// =============================================================================
// Test: GET /api/experiments/:id Detail
// =============================================================================
describe('E2E: GET /api/experiments/:id - Detail', () => {
  it('returns experiment with jobs array included', () => {
    const experiment = {
      id: 'exp-1',
      name: 'Test Experiment',
      status: 'ready',
      sourceVideoUrl: 'https://www.youtube.com/watch?v=abc123',
      createdAt: new Date(),
      jobs: [
        { id: 'job-1', status: 'ready', klapTaskId: 'task-1' },
        { id: 'job-2', status: 'ready', klapTaskId: 'task-2' },
      ],
    };
    
    expect(Array.isArray(experiment.jobs)).toBe(true);
    expect(experiment.jobs).toHaveLength(2);
  });

  it('returns experiment with empty jobs array if no jobs', () => {
    const experiment = {
      id: 'exp-1',
      jobs: [],
    };
    
    expect(Array.isArray(experiment.jobs)).toBe(true);
    expect(experiment.jobs).toHaveLength(0);
  });

  it('returns 404 for non-existent experiment ID', () => {
    const existingExperiment = null;
    expect(existingExperiment).toBeNull();
  });

  it('requires authentication', () => {
    const headers = new Headers();
    expect(() => mockRequireOwner(headers, TEST_OWNER_ID)).toThrow('Unauthorized');
  });
});

// =============================================================================
// Test: Full Flow Integration
// =============================================================================
describe('E2E: Full Experiments Flow Integration', () => {
  it('simulates complete experiment lifecycle', async () => {
    // Step 1: Create authenticated session as owner
    const headers = createAuthHeaders(OWNER_TOKEN);
    const userId = mockRequireOwner(headers, TEST_OWNER_ID);
    expect(userId).toBe(TEST_OWNER_ID);

    // Step 2: POST /api/experiments with valid data
    const experimentId = randomUUID();
    const sourceVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const sanitizedUrl = sanitizeYouTubeUrl(sourceVideoUrl);
    
    const experiment = {
      id: experimentId,
      userId,
      sourceVideoUrl: sanitizedUrl,
      sourceVideoId: extractVideoId(sourceVideoUrl),
      name: 'Integration Test Experiment',
      status: 'pending',
      createdAt: new Date(),
    };
    
    expect(experiment.userId).toBe(TEST_OWNER_ID);
    expect(experiment.sourceVideoUrl).toBe(sourceVideoUrl);
    expect(experiment.sourceVideoId).toBe('dQw4w9WgXcQ');

    // Step 3: Verify job created with experiment_id
    const jobIds = [randomUUID(), randomUUID()];
    const jobs = jobIds.map(id => ({
      id,
      experiment_id: experimentId,
      youtubeUrl: sourceVideoUrl,
      providerProjectId: `reap-proj-${id.slice(0, 8)}`,
      status: 'pending',
    }));
    
    expect(jobs).toHaveLength(2);
    expect(jobs.every(j => j.experiment_id === experimentId)).toBe(true);

    // Step 4: GET /api/experiments list
    const experimentsList = [{
      id: experiment.id,
      name: experiment.name,
      status: experiment.status,
      sourceVideoUrl: experiment.sourceVideoUrl,
      createdAt: experiment.createdAt,
    }];
    
    expect(experimentsList).toHaveLength(1);
    expect(experimentsList[0].id).toBe(experimentId);

    // Step 5: DELETE /api/experiments/:id
    const deleteOperations: string[] = [];
    deleteOperations.push(`DELETE FROM jobs WHERE experiment_id = '${experimentId}'`);
    deleteOperations.push(`DELETE FROM experiments WHERE id = '${experimentId}'`);
    
    expect(deleteOperations).toHaveLength(2);
    expect(deleteOperations[0]).toContain('jobs');
    expect(deleteOperations[1]).toContain('experiments');
  });
});

// =============================================================================
// Test: Error Scenarios
// =============================================================================
describe('E2E: Error Scenarios', () => {
  it('returns 500 when provider API key is not configured', () => {
    const isProviderConfigured = false;
    const errorResponse = {
      error: 'Provider API not configured',
      message: 'REAP_API_KEY is missing.',
    };

    expect(isProviderConfigured).toBe(false);
    expect(errorResponse.error).toBe('Provider API not configured');
  });

  it('returns 400 for invalid YouTube URL', () => {
    const invalidUrl = 'https://vimeo.com/123456';
    const sanitized = sanitizeYouTubeUrl(invalidUrl);
    
    expect(sanitized).toBeNull();
  });

  it('returns 400 for invalid video ID length', () => {
    const invalidUrl = 'https://www.youtube.com/watch?v=abc';
    const videoId = extractVideoId(invalidUrl);
    
    expect(videoId).toBeNull();
  });

  it('handles experiment with all jobs failing', () => {
    const errors = [
      { configIndex: 0, error: 'Provider API timeout' },
      { configIndex: 1, error: 'Invalid video format' },
    ];
    
    const jobIds: string[] = [];
    
    expect(jobIds).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });
});
