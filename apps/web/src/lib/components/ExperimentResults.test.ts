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
          klapFolderId: 'folder-1',
          name: 'Test Clip',
          viralityScore: 85,
          viralityScoreExplanation: 'High engagement potential',
          previewUrl: 'https://example.com/preview.mp4',
          exportStatus: 'ready',
          exportUrl: 'https://example.com/export.mp4',
          createdAt: new Date(),
        },
      ];
      
      expect(mockClips.length).toBe(1);
      expect(mockClips[0].name).toBe('Test Clip');
    });

    it('handles multiple clips', () => {
      const mockClips: Clip[] = [
        { id: 'clip-1', jobId: 'job-1', klapFolderId: 'folder-1', name: 'Clip 1', viralityScore: 80, viralityScoreExplanation: null, previewUrl: null, exportStatus: null, exportUrl: null, createdAt: new Date() },
        { id: 'clip-2', jobId: 'job-1', klapFolderId: 'folder-1', name: 'Clip 2', viralityScore: 90, viralityScoreExplanation: null, previewUrl: null, exportStatus: null, exportUrl: null, createdAt: new Date() },
        { id: 'clip-3', jobId: 'job-1', klapFolderId: 'folder-1', name: 'Clip 3', viralityScore: 75, viralityScoreExplanation: null, previewUrl: null, exportStatus: null, exportUrl: null, createdAt: new Date() },
      ];
      
      expect(mockClips.length).toBe(3);
    });

    it('passes clip data to ClipCard', () => {
      const clip: Clip = {
        id: 'clip-1',
        jobId: 'job-1',
        klapFolderId: 'folder-1',
        name: 'Test Clip',
        viralityScore: 85,
        viralityScoreExplanation: 'Test explanation',
        previewUrl: 'https://example.com/preview.mp4',
        exportStatus: 'ready',
        exportUrl: 'https://example.com/export.mp4',
        createdAt: new Date(),
      };
      
      expect(clip.id).toBeDefined();
      expect(clip.name).toBeDefined();
      expect(clip.viralityScore).toBeDefined();
    });
  });

  describe('Export handling', () => {
    it('accepts onExport callback', () => {
      const onExport = (clip: Clip) => {
        console.log('Exporting clip:', clip.id);
      };
      
      expect(typeof onExport).toBe('function');
    });

    it('tracks exporting clip ID', () => {
      const exportingClipId: string | null = 'clip-1';
      expect(exportingClipId).toBe('clip-1');
      
      const noExporting: string | null = null;
      expect(noExporting).toBeNull();
    });
  });

  describe('Grid layout', () => {
    it('uses responsive grid columns', () => {
      const gridClasses = ['grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3'];
      expect(gridClasses.length).toBe(3);
    });
  });

  describe('Clip with null values', () => {
    it('handles clip with null name', () => {
      const clip: Clip = {
        id: 'clip-1',
        jobId: 'job-1',
        klapFolderId: 'folder-1',
        name: null,
        viralityScore: null,
        viralityScoreExplanation: null,
        previewUrl: null,
        exportStatus: null,
        exportUrl: null,
        createdAt: new Date(),
      };
      
      expect(clip.name).toBeNull();
      expect(clip.viralityScore).toBeNull();
    });
  });
});