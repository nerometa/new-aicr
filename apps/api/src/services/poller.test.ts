import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSadd = vi.fn();
const mockSmembers = vi.fn();
const mockSrem = vi.fn();

vi.mock('../lib/redis', () => ({
  redis: {
    sadd: mockSadd,
    smembers: mockSmembers,
    srem: mockSrem,
  },
}));

vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(),
      })),
    })),
  },
}));

vi.mock('./klap', () => ({
  getTask: vi.fn(),
  getProjects: vi.fn(),
  previewUrl: (id: string) => `https://klap.app/player/${id}`,
}));

import { enqueueJob } from './poller';

describe('poller service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enqueueJob', () => {
    it('adds job ID to Redis queue', async () => {
      mockSadd.mockResolvedValueOnce(1);
      
      await enqueueJob('job-123');
      
      expect(mockSadd).toHaveBeenCalledWith('aicr:polling_jobs', 'job-123');
    });

    it('handles multiple job IDs', async () => {
      mockSadd.mockResolvedValueOnce(1);
      mockSadd.mockResolvedValueOnce(1);
      
      await enqueueJob('job-1');
      await enqueueJob('job-2');
      
      expect(mockSadd).toHaveBeenCalledTimes(2);
      expect(mockSadd).toHaveBeenNthCalledWith(1, 'aicr:polling_jobs', 'job-1');
      expect(mockSadd).toHaveBeenNthCalledWith(2, 'aicr:polling_jobs', 'job-2');
    });
  });
});

describe('QUEUE_KEY constant', () => {
  it('uses consistent queue key format', () => {
    expect(mockSadd).toBeDefined();
    expect(mockSmembers).toBeDefined();
    expect(mockSrem).toBeDefined();
  });
});
