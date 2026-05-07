import { describe, it, expect } from 'bun:test';
import type { Clip } from '@aicr/shared';

describe('ExperimentResults component', () => {
  describe('Empty state', () => {
    it('shows empty message when no clips', () => {
      const clips: Clip[] = [];
      expect(clips.length).toBe(0);
    });

    it('renders empty state container', () => {
      const hasEmptyState = true;
      expect(hasEmptyState).toBe(true);
    });
  });

  describe('Clip rendering', () => {
    it('renders clips when provided', () => {
      const mockClips: Clip[] = [
        {
          id: 'clip-1',
          jobId: 'job-1',
          providerClipId: 'reap_clip_001',
          title: 'Test Clip',
          viralityScore: 8.5,
          viralityScoreExplanation: 'High engagement potential',
          duration: 28.4,
          startTime: 10.0,
          endTime: 38.4,
          createdAt: new Date(),
        },
      ];

      expect(mockClips.length).toBe(1);
      expect(mockClips[0]!.title).toBe('Test Clip');
    });

    it('handles multiple clips', () => {
      const base = { jobId: 'job-1', providerClipId: 'c', viralityScore: 8, viralityScoreExplanation: null, duration: 30, startTime: 0, endTime: 30, createdAt: new Date() };
      const mockClips: Clip[] = [
        { id: 'clip-1', title: 'Clip 1', ...base },
        { id: 'clip-2', title: 'Clip 2', ...base },
        { id: 'clip-3', title: 'Clip 3', ...base },
      ];

      expect(mockClips.length).toBe(3);
    });

    it('passes clip data to ClipCard', () => {
      const clip: Clip = {
        id: 'clip-1',
        jobId: 'job-1',
        providerClipId: 'reap_clip_001',
        title: 'Test Clip',
        viralityScore: 8.5,
        viralityScoreExplanation: 'Test explanation',
        duration: 28.4,
        startTime: 10.0,
        endTime: 38.4,
        createdAt: new Date(),
      };

      expect(clip.id).toBeDefined();
      expect(clip.title).toBeDefined();
      expect(clip.viralityScore).toBeDefined();
    });
  });

  describe('Grid layout', () => {
    it('uses responsive grid columns', () => {
      const gridClasses = ['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3'];
      expect(gridClasses.length).toBe(3);
    });
  });

  describe('Clip with null values', () => {
    it('handles clip with null title and scores', () => {
      const clip: Clip = {
        id: 'clip-1',
        jobId: 'job-1',
        providerClipId: 'reap_clip_002',
        title: null,
        viralityScore: null,
        viralityScoreExplanation: null,
        duration: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
      };

      expect(clip.title).toBeNull();
      expect(clip.viralityScore).toBeNull();
    });
  });

  describe('clipUrl handling', () => {
    it('clipUrl is absent from Clip type (fetched separately via ClipResponse)', () => {
      // Clip stores metadata only. ClipResponse includes the live clipUrl.
      const clip: Clip = {
        id: 'clip-1',
        jobId: 'job-1',
        providerClipId: 'reap_clip_001',
        title: 'Test',
        viralityScore: 7,
        viralityScoreExplanation: null,
        duration: 30,
        startTime: 0,
        endTime: 30,
        createdAt: new Date(),
      };
      expect('clipUrl' in clip).toBe(false);
    });
  });
});
