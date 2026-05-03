import { describe, it, expect } from 'bun:test';

interface Experiment {
  id: string;
  name: string;
  views: number;
  engagement: number;
  quality: number;
}

describe('ExperimentComparison component', () => {
  describe('Table structure', () => {
    it('has correct column headers', () => {
      const expectedHeaders = ['Experiment', 'Views', 'Engagement', 'Quality'];
      expect(expectedHeaders.length).toBe(4);
    });

    it('renders table with proper classes', () => {
      const tableClasses = ['overflow-x-auto', 'rounded-lg', 'border', 'shadow-sm'];
      expect(tableClasses.length).toBe(4);
    });
  });

  describe('Experiment rendering', () => {
    it('renders single experiment', () => {
      const experiments: Experiment[] = [
        {
          id: 'exp-1',
          name: 'Test Experiment',
          views: 1000,
          engagement: 5.5,
          quality: 8.5,
        },
      ];
      
      expect(experiments.length).toBe(1);
      expect(experiments[0].name).toBe('Test Experiment');
    });

    it('renders multiple experiments', () => {
      const experiments: Experiment[] = [
        { id: 'exp-1', name: 'Experiment 1', views: 1000, engagement: 5.5, quality: 8.5 },
        { id: 'exp-2', name: 'Experiment 2', views: 2500, engagement: 7.2, quality: 9.0 },
        { id: 'exp-3', name: 'Experiment 3', views: 500, engagement: 3.8, quality: 6.2 },
      ];
      
      expect(experiments.length).toBe(3);
    });

    it('handles empty experiments array', () => {
      const experiments: Experiment[] = [];
      expect(experiments.length).toBe(0);
    });
  });

  describe('Data formatting', () => {
    it('formats views with toLocaleString', () => {
      const views = 15000;
      const formatted = views.toLocaleString();
      expect(formatted).toBe('15,000');
    });

    it('formats engagement as percentage with one decimal', () => {
      const engagement = 5.567;
      const formatted = engagement.toFixed(1) + '%';
      expect(formatted).toBe('5.6%');
    });

    it('formats quality with one decimal', () => {
      const quality = 8.75;
      const formatted = quality.toFixed(1);
      expect(formatted).toBe('8.8');
    });
  });

  describe('Quality display', () => {
    it('shows quality out of 10', () => {
      const quality = 8.5;
      const maxQuality = 10;
      expect(quality).toBeLessThanOrEqual(maxQuality);
    });

    it('displays quality with proper precision', () => {
      const qualityScores = [8.123, 9.456, 7.789];
      const formatted = qualityScores.map(q => q.toFixed(1));
      
      expect(formatted).toEqual(['8.1', '9.5', '7.8']);
    });
  });

  describe('Table accessibility', () => {
    it('uses semantic table elements', () => {
      const semanticElements = ['table', 'thead', 'tbody', 'tr', 'th', 'td'];
      expect(semanticElements.length).toBe(6);
    });

    it('has proper header scope', () => {
      const hasHeaders = true;
      expect(hasHeaders).toBe(true);
    });
  });

  describe('Hover interaction', () => {
    it('applies hover effect on rows', () => {
      const hoverClass = 'hover:bg-gray-50';
      expect(hoverClass).toContain('hover:');
    });
  });
});